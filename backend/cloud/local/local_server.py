"""Run the workflow API on your laptop (stdlib only) to test the Pi prober and dashboard before deploying.

    python3 cloud/local/local_server.py --port 8080 [--fail-after 120]

--fail-after N makes every non-health call return 503 after N seconds, so you can rehearse
failover with two local servers (one as PRIMARY_URL, one as SECONDARY_URL).
"""
import argparse
import json
import os
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "core"))
from workflow_core import CORS_HEADERS, MemoryStore, handle  # noqa: E402

STORE = MemoryStore()
STARTED = time.time()
ARGS = None


class Handler(BaseHTTPRequestHandler):
    def _go(self):
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length).decode() if length else None
        path = self.path.split("?")[0]
        STORE.upload_base = f"http://{self.headers.get('Host', 'localhost')}"
        if ARGS.fail_after and time.time() - STARTED > ARGS.fail_after:
            status, payload = 503, {"error": "simulated outage"}
        else:
            status, payload = handle(self.command, path, dict(self.headers), body, STORE)
        raw = json.dumps(payload).encode()
        self.send_response(status)
        for k, v in CORS_HEADERS.items():
            self.send_header(k, v)
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    do_GET = do_POST = do_OPTIONS = _go

    def do_PUT(self):  # stands in for the S3 presigned upload
        self.rfile.read(int(self.headers.get("Content-Length") or 0))
        self.send_response(200)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def log_message(self, fmt, *args):
        if not ARGS.quiet:
            super().log_message(fmt, *args)


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--port", type=int, default=8080)
    p.add_argument("--host", default="0.0.0.0")
    p.add_argument("--fail-after", type=float, default=0)
    p.add_argument("--name", default="local")
    p.add_argument("--quiet", action="store_true")
    ARGS = p.parse_args()
    import workflow_core
    workflow_core.CLOUD = ARGS.name
    print(f"workflow API ({ARGS.name}) on http://{ARGS.host}:{ARGS.port}  token={'set' if os.environ.get('API_TOKEN') else 'off'}")
    ThreadingHTTPServer((ARGS.host, ARGS.port), Handler).serve_forever()
