#!/usr/bin/env python3
"""Raspberry Pi edge node: synthetic workflow load, p95 latency telemetry and multi-cloud failover.

It behaves like a branch office: employees submit requests, approvers act on them, receipts
are uploaded straight to S3. Every call is timed and logged to CSV. If the primary cloud stops
answering, traffic moves to the secondary and the measured switchover time is recorded; when
the primary is healthy again, traffic moves back.

    python3 prober.py --env-file prober.env                 # run forever (what systemd does)
    python3 prober.py --env-file prober.env --rate 300 --duration 300   # 5 minute benchmark at 300 req/min
    python3 prober.py --env-file prober.env --smoke         # one pass through every endpoint, then exit
"""
import argparse
import asyncio
import csv
import json
import os
import random
import signal
import socket
import statistics
import time
from datetime import datetime, timezone

import aiohttp

TYPES = ["PURCHASE", "LEAVE", "EXPENSE", "IT_ACCESS"]
TITLES = {
    "PURCHASE": ["Laptop for new hire", "Office chairs x4", "Network switch"],
    "LEAVE": ["Annual leave 3 days", "Medical leave", "Conference travel"],
    "EXPENSE": ["Client lunch", "Cab to airport", "Training course fee"],
    "IT_ACCESS": ["GitHub org access", "VPN account", "Jira admin rights"],
}


def load_env_file(path):
    if not path or not os.path.exists(path):
        return
    for line in open(path):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"'))


def pct(values, p):
    if not values:
        return None
    s = sorted(values)
    k = max(0, min(len(s) - 1, int(round(p / 100 * len(s) + 0.5)) - 1))
    return round(s[k], 1)


def read_pi_health():
    out = {}
    try:
        out["cpuTempC"] = round(int(open("/sys/class/thermal/thermal_zone0/temp").read()) / 1000, 1)
    except OSError:
        pass
    try:
        out["load1"] = os.getloadavg()[0]
    except OSError:
        pass
    try:
        mem = dict(l.split(":", 1) for l in open("/proc/meminfo"))
        out["memAvailMB"] = int(mem["MemAvailable"].split()[0]) // 1024
    except (OSError, KeyError):
        pass
    try:
        for line in open("/proc/net/wireless").readlines()[2:]:
            f = line.split()
            out["wifiLinkQuality"] = float(f[2].rstrip("."))
            out["wifiSignalDbm"] = float(f[3].rstrip("."))
    except (OSError, IndexError, ValueError):
        pass
    return out


class Prober:
    def __init__(self, cfg):
        self.cfg = cfg
        self.endpoints = {"primary": cfg.primary.rstrip("/")}
        if cfg.secondary:
            self.endpoints["secondary"] = cfg.secondary.rstrip("/")
        self.cloud_of = {}            # endpoint name -> cloud reported by /health (aws / gcp)
        self.active = "primary"
        self.fails = 0                # consecutive failures on the active endpoint
        self.outage_started = None    # epoch ms of the first failure of the current outage
        self.outage_from = None
        self.open = {k: [] for k in self.endpoints}   # in-flight workflow requests per endpoint
        self.window = []              # samples since the last telemetry report
        self.window_events = []
        self.turnarounds = []
        self.auth = {}                # endpoint -> /health auth block (how to sign in to that cloud)
        self.tokens = {}              # endpoint -> (Cognito ID token, expiry epoch s)
        self.stop = asyncio.Event()
        self.sem = asyncio.Semaphore(cfg.concurrency)
        os.makedirs(cfg.log_dir, exist_ok=True)
        self._csv_day = None
        self._csv = None

    # ------------------------------------------------------------ logging
    def _writer(self):
        day = datetime.now(timezone.utc).strftime("%Y%m%d")
        if day != self._csv_day:
            if self._csv:
                self._csv[0].close()
            path = os.path.join(self.cfg.log_dir, f"samples-{day}.csv")
            new = not os.path.exists(path)
            fh = open(path, "a", newline="", buffering=1)
            w = csv.writer(fh)
            if new:
                w.writerow(["ts", "epoch_ms", "endpoint", "cloud", "op", "status", "latency_ms", "ok", "error"])
            self._csv, self._csv_day = (fh, w), day
            self._prune_old_logs()
        return self._csv[1]

    def _prune_old_logs(self):
        cutoff = time.time() - self.cfg.keep_days * 86400
        for f in os.listdir(self.cfg.log_dir):
            p = os.path.join(self.cfg.log_dir, f)
            if f.startswith("samples-") and os.path.getmtime(p) < cutoff:
                os.remove(p)

    def record(self, endpoint, op, status, latency, ok, error=""):
        ts = time.time()
        sample = {"t": ts, "endpoint": endpoint, "cloud": self.cloud_of.get(endpoint, endpoint),
                  "op": op, "status": status, "ms": latency, "ok": ok}
        self.window.append(sample)
        self._writer().writerow([datetime.fromtimestamp(ts, timezone.utc).isoformat(timespec="milliseconds"),
                                 int(ts * 1000), endpoint, sample["cloud"], op, status,
                                 round(latency, 1), int(ok), error[:120]])

    def event(self, kind, **kw):
        ev = {"ts": datetime.now(timezone.utc).isoformat(timespec="milliseconds"), "event": kind, **kw}
        self.window_events.append(ev)
        with open(os.path.join(self.cfg.log_dir, "events.jsonl"), "a") as fh:
            fh.write(json.dumps(ev) + "\n")
        print(f"[{ev['ts']}] {kind} {json.dumps(kw)}", flush=True)

    # ------------------------------------------------------------ HTTP
    async def sign_in(self, endpoint):
        """Cognito USER_PASSWORD_AUTH for stacks that use it; the token is reused until 5 min before expiry."""
        auth = self.auth.get(endpoint) or {}
        if auth.get("type") != "cognito" or not self.cfg.user:
            return None
        tok = self.tokens.get(endpoint)
        if tok and tok[1] - time.time() > 300:
            return tok[0]
        try:
            async with self.session.post(
                    f"https://cognito-idp.{auth['region']}.amazonaws.com/",
                    headers={"Content-Type": "application/x-amz-json-1.1",
                             "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth"},
                    data=json.dumps({"AuthFlow": "USER_PASSWORD_AUTH", "ClientId": auth["clientId"],
                                     "AuthParameters": {"USERNAME": self.cfg.user,
                                                        "PASSWORD": self.cfg.password}})) as r:
                res = await r.json(content_type=None)
            result = res["AuthenticationResult"]
            self.tokens[endpoint] = (result["IdToken"], time.time() + result["ExpiresIn"])
            return result["IdToken"]
        except (aiohttp.ClientError, asyncio.TimeoutError, KeyError, ValueError, TypeError) as e:
            print(f"sign-in to {endpoint} failed: {type(e).__name__} {str(e)[:120]}", flush=True)
            return None

    async def headers(self, endpoint, role, user):
        h = {"Content-Type": "application/json", "X-Role": role, "X-User": user}
        token = await self.sign_in(endpoint) or self.cfg.token
        if token:
            h["Authorization"] = f"Bearer {token}"
        return h

    async def raw(self, endpoint, method, path, role="Employee", user=None, body=None, op=None):
        """One timed call to a specific endpoint. Returns (ok, status, json_or_None)."""
        url = self.endpoints[endpoint] + path
        hdrs = await self.headers(endpoint, role, user or self.cfg.node)
        t0 = time.perf_counter()
        status, data, err = 0, None, ""
        try:
            async with self.session.request(method, url, headers=hdrs,
                                            data=json.dumps(body) if body is not None else None) as r:
                status = r.status
                try:
                    data = await r.json(content_type=None)
                except ValueError:
                    data = None
        except (aiohttp.ClientError, asyncio.TimeoutError, OSError) as e:
            err = type(e).__name__
        ms = (time.perf_counter() - t0) * 1000
        ok = 0 < status < 500 and status != 401           # a rejected token means we cannot use this cloud
        if status == 401:
            self.tokens.pop(endpoint, None)
        if path == "/health" and isinstance(data, dict) and data.get("auth"):
            self.auth[endpoint] = data["auth"]       # learn how to sign in, even if the cloud was down at start
        if not ok and not err and isinstance(data, dict):
            err = str(data.get("error") or data.get("message") or "")
        self.record(endpoint, op or path.split("/")[1], status, ms, ok, err)
        return ok, status, data

    async def call(self, method, path, **kw):
        """A call on the active endpoint, with failure counting and failover."""
        ep = self.active
        ok, status, data = await self.raw(ep, method, path, **kw)
        if ok:
            if self.outage_started and ep != self.outage_from:
                self.event("FAILOVER_COMPLETE", frm=self.outage_from, to=ep, cloud=self.cloud_of.get(ep),
                           failover_ms=int(time.time() * 1000) - self.outage_started)
            if ep == self.active:
                self.fails, self.outage_started = 0, None
        elif ep == self.active:
            self.fails += 1
            if not self.outage_started:
                self.outage_started, self.outage_from = int(time.time() * 1000), ep
            if self.fails >= self.cfg.failover_after and len(self.endpoints) > 1:
                nxt = "secondary" if ep == "primary" else "primary"
                self.event("FAILOVER_START", frm=ep, to=nxt, consecutive_failures=self.fails,
                           last_status=status)
                self.active, self.fails = nxt, 0
        return ok, status, data

    # ------------------------------------------------------------ workload
    async def op_create(self):
        rtype = random.choice(TYPES if self.cloud_of.get(self.active) != "gcp" else
                              [t for t in TYPES if t != "EXPENSE"])   # uploads are AWS-only
        body = {"type": rtype, "title": random.choice(TITLES[rtype]), "source": "edge-pi",
                "details": f"synthetic load from {self.cfg.node}"}
        if rtype in ("PURCHASE", "EXPENSE"):
            body["amount"] = round(random.uniform(20, 5000), 2)
        ep = self.active
        ok, status, data = await self.call("POST", "/requests", body=body, op="create")
        if ok and status == 201:
            self.open[ep].append(data)

    async def op_advance(self):
        ep = self.active
        if not self.open[ep]:
            return await self.op_create()
        req = self.open[ep].pop(random.randrange(len(self.open[ep])))
        role = req["pendingRole"]
        if req["type"] == "EXPENSE" and role == "Finance" and not req.get("attachments"):
            ok, status, data = await self.call("POST", f"/requests/{req['id']}/upload-url", role="Employee",
                                               body={"filename": "receipt.txt", "contentType": "text/plain"},
                                               op="upload_url")
            if not (ok and status == 200):
                return
            await self.s3_put(ep, data)
            req["attachments"] = [data["key"]]
            req["version"] += 1
        action = "REJECT" if random.random() < 0.1 else "APPROVE"
        ok, status, data = await self.call("POST", f"/requests/{req['id']}/actions", role=role,
                                           user=f"{role.lower()}-{self.cfg.node}",
                                           body={"action": action, "version": req["version"],
                                                 "comment": "auto-approved by edge prober"}, op="approve")
        if ok and status == 200:
            if data["status"] == "PENDING":
                self.open[ep].append(data)
            elif "turnaroundMs" in data:
                self.turnarounds.append(data["turnaroundMs"])
        elif ok and status == 409:
            pass                              # someone else moved it; drop it from our list

    async def s3_put(self, endpoint, presign):
        t0 = time.perf_counter()
        status, err = 0, ""
        try:
            async with self.session.put(presign["uploadUrl"], data=b"synthetic receipt\n",
                                        headers={"Content-Type": presign["contentType"]}) as r:
                status = r.status
                if status >= 300:
                    err = (await r.text())[:120]
        except (aiohttp.ClientError, asyncio.TimeoutError) as e:
            err = type(e).__name__
        self.record(endpoint, "s3_upload", status, (time.perf_counter() - t0) * 1000, 0 < status < 300, err)

    async def op_read(self):
        ep = self.active
        if self.open[ep] and random.random() < 0.6:
            await self.call("GET", f"/requests/{random.choice(self.open[ep])['id']}", op="get")
        else:
            role = random.choice(["Manager", "Finance", "HR", "IT", "Procurement"])
            await self.call("GET", "/requests", role=role, op="queue")

    async def one_op(self):
        async with self.sem:
            n_open = len(self.open[self.active])
            r = random.random()
            if n_open < 5 or r < 0.35:
                await self.op_create()
            elif r < 0.85:
                await self.op_advance()
            else:
                await self.op_read()

    # ------------------------------------------------------------ loops
    async def load_loop(self, rate, duration):
        interval = 60.0 / rate
        start = nxt = time.monotonic()
        tasks = set()
        while not self.stop.is_set():
            if duration and time.monotonic() - start >= duration:
                break
            t = asyncio.create_task(self.one_op())
            tasks.add(t)
            t.add_done_callback(tasks.discard)
            nxt += interval
            delay = nxt - time.monotonic()
            if delay > 0:
                try:
                    await asyncio.wait_for(self.stop.wait(), timeout=delay)
                except asyncio.TimeoutError:
                    pass
        if tasks:
            await asyncio.wait(tasks, timeout=self.cfg.timeout + 1)
        self.stop.set()

    async def health_loop(self):
        """Active health checks: detects an outage even when load is low, and drives failback."""
        primary_ok_streak = 0
        while not self.stop.is_set():
            if self.active == "primary":
                await self.call("GET", "/health", op="health")
            else:
                ok, status, data = await self.raw("primary", "GET", "/health", op="health_standby")
                primary_ok_streak = primary_ok_streak + 1 if ok and status == 200 else 0
                if primary_ok_streak >= self.cfg.failback_after:
                    self.event("FAILBACK", to="primary", healthy_checks=primary_ok_streak)
                    self.active, self.fails, primary_ok_streak = "primary", 0, 0
            try:
                await asyncio.wait_for(self.stop.wait(), timeout=self.cfg.health_interval)
            except asyncio.TimeoutError:
                pass

    def summarize(self):
        w = [x for x in self.window if x["op"] != "health_standby"]   # probes of the down cloud aren't user traffic
        self.window = []
        evs, self.window_events = self.window_events, []
        tat, self.turnarounds = self.turnarounds, []
        lat = [s["ms"] for s in w if s["ok"]]
        by_cloud = {}
        for s in w:
            by_cloud[s["cloud"]] = by_cloud.get(s["cloud"], 0) + 1
        span = (w[-1]["t"] - w[0]["t"]) if len(w) > 1 else 0
        failover = [e["failover_ms"] for e in evs if e["event"] == "FAILOVER_COMPLETE"]
        return {
            "node": self.cfg.node,
            "hostname": socket.gethostname(),
            "ts": int(time.time() * 1000),
            "activeEndpoint": self.active,
            "activeCloud": self.cloud_of.get(self.active, self.active),
            "count": len(w),
            "errors": sum(1 for s in w if not s["ok"]),
            "reqPerMin": round(len(w) / span * 60, 1) if span else len(w),
            "p50": pct(lat, 50), "p95": pct(lat, 95), "p99": pct(lat, 99),
            "mean": round(statistics.fmean(lat), 1) if lat else None,
            "max": round(max(lat), 1) if lat else None,
            "sloP95Ms": 2000,
            "sloMet": (pct(lat, 95) or 0) < 2000,
            "byCloud": by_cloud,
            "events": [e["event"] for e in evs],
            "failoverMs": failover[-1] if failover else None,
            "completedWorkflows": len(tat),
            "avgTurnaroundMs": round(statistics.fmean(tat)) if tat else None,
            "pi": read_pi_health(),
        }

    async def report_loop(self):
        while not self.stop.is_set():
            try:
                await asyncio.wait_for(self.stop.wait(), timeout=self.cfg.report_interval)
            except asyncio.TimeoutError:
                pass
            await self.report()

    async def report(self):
        if not self.window:
            return
        s = self.summarize()
        with open(os.path.join(self.cfg.log_dir, "summaries.jsonl"), "a") as fh:
            fh.write(json.dumps(s) + "\n")
        print(f"[{datetime.now(timezone.utc):%H:%M:%S}] {s['activeCloud']:>9} n={s['count']} err={s['errors']} "
              f"p50={s['p50']}ms p95={s['p95']}ms p99={s['p99']}ms rate={s['reqPerMin']}/min "
              f"temp={s['pi'].get('cpuTempC')}C", flush=True)
        # Ship the summary to whichever cloud is up (not counted in the latency stats).
        for ep in [self.active] + [e for e in self.endpoints if e != self.active]:
            try:
                async with self.session.post(self.endpoints[ep] + "/telemetry", json=s,
                                             headers=await self.headers(ep, "Employee", self.cfg.node)) as r:
                    if r.status < 300:
                        break
            except (aiohttp.ClientError, asyncio.TimeoutError):
                continue

    async def discover(self):
        for ep in self.endpoints:
            ok, status, data = await self.raw(ep, "GET", "/health", op="discover")
            if ok and isinstance(data, dict):
                self.cloud_of[ep] = data.get("cloud", ep)
                self.auth[ep] = data.get("auth") or {}
            print(f"{ep:>9}: {self.endpoints[ep]} -> {status} {data}", flush=True)
        if len(set(self.cloud_of.values())) < len(self.cloud_of):     # e.g. two AWS stacks: label them apart
            self.cloud_of = {ep: f"{c}-{ep}" for ep, c in self.cloud_of.items()}

    async def smoke(self):
        """Walk one request of every type through its full approval chain on each endpoint."""
        passed = True
        for ep in self.endpoints:
            self.active = ep
            for rtype in TYPES:
                if rtype == "EXPENSE" and self.cloud_of.get(ep) == "gcp":
                    continue
                body = {"type": rtype, "title": f"smoke {rtype}", "amount": 99.5, "source": "edge-pi"}
                ok, status, req = await self.call("POST", "/requests", body=body, op="create")
                if status != 201:
                    print(f"  {ep} create {rtype}: FAIL {status} {req}")
                    passed = False
                    continue
                self.open[ep] = [req]
                while self.open[ep]:
                    await self.op_advance()
                print(f"  {ep} {rtype}: walked to the end of its chain")
            ok, status, _ = await self.call("GET", "/requests", role="Manager", op="queue")
            passed &= status == 200
        passed &= all(s["ok"] for s in self.window)
        await self.report()
        print("SMOKE PASS" if passed else "SMOKE FAIL", flush=True)
        return passed

    async def run(self, rate, duration, smoke=False):
        timeout = aiohttp.ClientTimeout(total=self.cfg.timeout)
        connector = aiohttp.TCPConnector(limit=self.cfg.concurrency * 2, ttl_dns_cache=10)  # short DNS cache for DNS failover
        async with aiohttp.ClientSession(timeout=timeout, connector=connector) as self.session:
            await self.discover()
            if smoke:
                return await self.smoke()
            self.event("START", node=self.cfg.node, rate=rate, endpoints=self.endpoints, clouds=self.cloud_of)
            await asyncio.gather(self.load_loop(rate, duration), self.health_loop(), self.report_loop())
            await self.report()
            self.event("STOP")
            return True


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--env-file", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "prober.env"))
    ap.add_argument("--rate", type=float, help="operations per minute (default RATE_PER_MIN or 60)")
    ap.add_argument("--duration", type=float, default=0, help="seconds to run, 0 = forever")
    ap.add_argument("--smoke", action="store_true")
    args = ap.parse_args()
    load_env_file(args.env_file)
    e = os.environ.get
    cfg = argparse.Namespace(
        primary=e("PRIMARY_URL", "http://localhost:8080"),
        secondary=e("SECONDARY_URL", ""),
        token=e("API_TOKEN", ""),
        user=e("COGNITO_USER", ""),
        password=e("COGNITO_PASSWORD", ""),
        node=e("NODE_ID", "pi-edge-01"),
        log_dir=e("LOG_DIR", os.path.expanduser("~/edge-logs")),
        timeout=float(e("TIMEOUT_S", "4")),
        concurrency=int(e("CONCURRENCY", "16")),
        failover_after=int(e("FAILOVER_AFTER", "3")),
        failback_after=int(e("FAILBACK_AFTER", "5")),
        health_interval=float(e("HEALTH_INTERVAL_S", "2")),
        report_interval=float(e("REPORT_INTERVAL_S", "60")),
        keep_days=int(e("KEEP_DAYS", "7")),
    )
    rate = args.rate or float(e("RATE_PER_MIN", "60"))
    prober = Prober(cfg)
    loop = asyncio.new_event_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, prober.stop.set)
    ok = loop.run_until_complete(prober.run(rate, args.duration, args.smoke))
    raise SystemExit(0 if ok else 1)


if __name__ == "__main__":
    main()
