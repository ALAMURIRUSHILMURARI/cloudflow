#!/usr/bin/env python3
"""Turn the Pi's raw logs into the numbers for the SMART objectives (stdlib only, runs on Pi or laptop).

    python3 report.py ~/edge-logs                       # all samples
    python3 report.py ~/edge-logs --since 2026-10-29T12:00 --out results
    python3 report.py ~/edge-logs --last-run --out results/run500   # just the latest run of the service
Writes results/report.md and results/latency.svg (p95 per minute with failover markers).
"""
import argparse
import csv
import glob
import json
import os
from collections import defaultdict
from datetime import datetime, timezone


def pct(v, p):
    if not v:
        return None
    s = sorted(v)
    return round(s[max(0, min(len(s) - 1, int(round(p / 100 * len(s) + 0.5)) - 1))], 1)


def load(log_dir, since):
    rows = []
    for path in sorted(glob.glob(os.path.join(log_dir, "samples-*.csv"))):
        with open(path) as fh:
            for r in csv.DictReader(fh):
                if since and r["ts"] < since:
                    continue
                r["epoch_ms"] = int(r["epoch_ms"])
                r["latency_ms"] = float(r["latency_ms"])
                r["ok"] = r["ok"] == "1"
                rows.append(r)
    events = []
    ev_path = os.path.join(log_dir, "events.jsonl")
    if os.path.exists(ev_path):
        events = [json.loads(l) for l in open(ev_path) if l.strip()]
        if since:
            events = [e for e in events if e["ts"] >= since]
    return rows, events


def table(rows, key):
    groups = defaultdict(list)
    for r in rows:
        groups[key(r)].append(r)
    out = ["| group | calls | errors | err % | p50 ms | p95 ms | p99 ms | max ms |", "|---|---|---|---|---|---|---|---|"]
    for g, rs in sorted(groups.items()):
        lat = [r["latency_ms"] for r in rs if r["ok"]]
        err = sum(1 for r in rs if not r["ok"])
        out.append(f"| {g} | {len(rs)} | {err} | {100 * err / len(rs):.2f} | {pct(lat, 50)} | {pct(lat, 95)} | "
                   f"{pct(lat, 99)} | {round(max(lat), 1) if lat else None} |")
    return "\n".join(out)


def svg_chart(rows, events, path):
    per_min = defaultdict(list)
    for r in rows:
        if r["ok"] and r["op"] not in ("health_standby", "s3_upload"):
            per_min[r["epoch_ms"] // 60000].append(r["latency_ms"])
    if len(per_min) < 2:
        return False
    xs = sorted(per_min)
    ys = [pct(per_min[x], 95) for x in xs]
    W, H, L, B = 900, 360, 60, 40
    ymax = max(max(ys) * 1.15, 2200)
    sx = lambda x: L + (x - xs[0]) / (xs[-1] - xs[0]) * (W - L - 20)
    sy = lambda y: H - B - y / ymax * (H - B - 20)
    pts = " ".join(f"{sx(x):.1f},{sy(y):.1f}" for x, y in zip(xs, ys))
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" font-family="sans-serif" font-size="12">',
             f'<rect width="{W}" height="{H}" fill="white"/>',
             f'<line x1="{L}" y1="{sy(2000):.1f}" x2="{W - 20}" y2="{sy(2000):.1f}" stroke="#c0392b" stroke-dasharray="6 4"/>',
             f'<text x="{W - 24}" y="{sy(2000) - 6:.1f}" text-anchor="end" fill="#c0392b">SLO p95 &lt; 2000 ms</text>']
    for e in events:
        if e["event"] in ("FAILOVER_START", "FAILBACK"):
            t = datetime.fromisoformat(e["ts"]).timestamp() * 1000 // 60000
            if xs[0] <= t <= xs[-1]:
                color = "#e67e22" if e["event"] == "FAILOVER_START" else "#27ae60"
                parts.append(f'<line x1="{sx(t):.1f}" y1="20" x2="{sx(t):.1f}" y2="{H - B}" stroke="{color}"/>')
                parts.append(f'<text x="{sx(t) + 4:.1f}" y="{32 if e["event"] == "FAILOVER_START" else 50}" fill="{color}">{e["event"].lower()}</text>')
    for i in range(5):
        v = ymax * i / 4
        parts.append(f'<text x="{L - 6}" y="{sy(v) + 4:.1f}" text-anchor="end" fill="#555">{int(v)}</text>')
    parts += [f'<line x1="{L}" y1="{H - B}" x2="{W - 20}" y2="{H - B}" stroke="#999"/>',
              f'<polyline points="{pts}" fill="none" stroke="#2c6fbb" stroke-width="2"/>',
              f'<text x="{L}" y="{H - 12}" fill="#555">{datetime.fromtimestamp(xs[0] * 60, timezone.utc):%H:%M} UTC</text>',
              f'<text x="{W - 20}" y="{H - 12}" text-anchor="end" fill="#555">'
              f'{datetime.fromtimestamp(xs[-1] * 60, timezone.utc):%H:%M} UTC</text>',
              f'<text x="{L}" y="14" fill="#222">Edge-measured p95 latency per minute (Raspberry Pi)</text></svg>']
    open(path, "w").write("\n".join(parts))
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("log_dir")
    ap.add_argument("--since", default="", help="ISO time, e.g. 2026-10-29T12:00")
    ap.add_argument("--out", default="results")
    ap.add_argument("--last-run", action="store_true", help="only the most recent prober run (since its START event)")
    a = ap.parse_args()
    if a.last_run:
        ev_path = os.path.join(a.log_dir, "events.jsonl")
        starts = [json.loads(l)["ts"] for l in open(ev_path) if '"START"' in l] if os.path.exists(ev_path) else []
        a.since = starts[-1] if starts else a.since
    rows, events = load(a.log_dir, a.since)
    if not rows:
        raise SystemExit("no samples found")
    os.makedirs(a.out, exist_ok=True)
    work = [r for r in rows if r["op"] not in ("health_standby", "discover")]
    lat = [r["latency_ms"] for r in work if r["ok"]]
    errs = sum(1 for r in work if not r["ok"])
    span_min = (rows[-1]["epoch_ms"] - rows[0]["epoch_ms"]) / 60000 or 1
    fo = [e for e in events if e["event"] == "FAILOVER_COMPLETE"]
    p95 = pct(lat, 95)
    avail = 100 * (1 - errs / len(work))
    md = [f"# Edge test results\n",
          f"Window: {rows[0]['ts']} to {rows[-1]['ts']} ({span_min:.1f} min), {len(work)} calls, "
          f"{len(work) / span_min:.0f} calls/min average.\n",
          "## SMART objective check\n",
          "| objective | target | measured | met |", "|---|---|---|---|",
          f"| p95 API latency from the edge | < 2000 ms | {p95} ms | {'yes' if p95 and p95 < 2000 else 'no'} |",
          f"| client-observed success rate | 99.9 % | {avail:.3f} % | {'yes' if avail >= 99.9 else 'no'} |"]
    if fo:
        worst = max(e["failover_ms"] for e in fo)
        md.append(f"| failover time (first failure to first success on standby) | < 15 s | "
                  f"{worst / 1000:.1f} s worst of {len(fo)} | {'yes' if worst < 15000 else 'no'} |")
    else:
        md.append("| failover time | < 15 s | no failover in this window | n/a |")
    md.append("\nCalls that fail while an outage is being detected count against the success rate. For the 99.9 % "
              "check, run this report on a steady-state window (use --since) and quote the chaos-drill run separately.")
    md += ["\n## By cloud\n", table(work, lambda r: r["cloud"]),
           "\n## By operation\n", table(work, lambda r: f"{r['cloud']} / {r['op']}"),
           "\n## Failover events\n"]
    md += [f"- {e['ts']} {e['event']} " + ", ".join(f"{k}={v}" for k, v in e.items() if k not in ("ts", "event"))
           for e in events if e["event"].startswith("FAIL")] or ["- none"]
    if svg_chart(rows, events, os.path.join(a.out, "latency.svg")):
        md.append("\n![p95 latency](latency.svg)\n")
    open(os.path.join(a.out, "report.md"), "w").write("\n".join(md) + "\n")
    print("\n".join(md))
    print(f"\nwrote {a.out}/report.md")


if __name__ == "__main__":
    main()
