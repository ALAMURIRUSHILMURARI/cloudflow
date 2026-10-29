"""Cloud-agnostic workflow engine shared by AWS Lambda, GCP Cloud Functions and the local test server.

Every adapter turns its platform request into handle(method, path, headers, body, store)
and turns the returned (status, body) back into a platform response. The store is the
only thing that differs between clouds, so both clouds expose an identical REST contract
and the Raspberry Pi can fail over between them without changing anything.
"""
import json
import os
import time
import uuid

CLOUD = os.environ.get("CLOUD_NAME", "local")
REGION = os.environ.get("CLOUD_REGION", "local")

ROLES = {"Employee", "Manager", "Procurement", "Finance", "HR", "IT", "Admin"}

# How callers prove who they are. "cognito": API Gateway has already verified a Cognito JWT and the
# adapter passes its claims in as `identity`. "token": shared bearer token (local server, GCP).
AUTH_MODE = os.environ.get("AUTH_MODE", "token")

# Approval chains from the methodology spec (section 1.2). Each entry is the role that
# must act at that stage; when the last stage approves, the request is COMPLETED.
WORKFLOWS = {
    "PURCHASE": ["Manager", "Procurement", "Finance"],   # then PO generation
    "LEAVE": ["Manager", "HR"],                          # then calendar notification
    "EXPENSE": ["Manager", "Finance"],                   # receipt upload, then disbursement
    "IT_ACCESS": ["Manager", "IT"],                      # then provisioning
}

COMPLETION_NOTE = {
    "PURCHASE": "Purchase order generated",
    "LEAVE": "Leave recorded on calendar",
    "EXPENSE": "Disbursement scheduled",
    "IT_ACCESS": "Access provisioned",
}


class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status
        self.message = message


def now_ms():
    return int(time.time() * 1000)


# ---------------------------------------------------------------- domain logic

def new_request(payload, user):
    rtype = str(payload.get("type", "")).upper()
    if rtype not in WORKFLOWS:
        raise ApiError(400, f"type must be one of {sorted(WORKFLOWS)}")
    title = str(payload.get("title", "")).strip()
    if not 3 <= len(title) <= 200:
        raise ApiError(400, "title must be 3-200 characters")
    amount = payload.get("amount")
    if rtype in ("PURCHASE", "EXPENSE"):
        try:
            amount = round(float(amount), 2)
        except (TypeError, ValueError):
            raise ApiError(400, "amount is required for PURCHASE and EXPENSE")
        if amount <= 0 or amount > 1_000_000:
            raise ApiError(400, "amount must be between 0 and 1,000,000")
    else:
        amount = None
    data = payload.get("data") or {}
    if not isinstance(data, dict) or len(json.dumps(data)) > 8000:
        raise ApiError(400, "data must be an object under 8 KB")
    profile = payload.get("requesterProfile") or {}
    profile = {k: str(profile.get(k, ""))[:100] for k in ("name", "email", "department", "employeeId")
               if isinstance(profile, dict) and profile.get(k)}
    ts = now_ms()
    chain = WORKFLOWS[rtype]
    return {
        "id": uuid.uuid4().hex[:12],
        "type": rtype,
        "title": title,
        "amount": amount,
        "details": str(payload.get("details", ""))[:2000],
        "requester": user,
        "status": "PENDING",
        "stage": 0,
        "pendingRole": chain[0],
        "history": [{"by": user, "role": "Employee", "action": "SUBMIT", "at": ts}],
        "attachments": [],
        "createdAt": ts,
        "updatedAt": ts,
        "completedAt": None,
        "version": 1,
        "source": str(payload.get("source") or "web")[:20],
        "priority": str(payload.get("priority") or "Normal")[:20],
        "data": data,                              # the web form's own fields, shown back on the details page
        "requesterProfile": profile,               # display only; identity comes from the token
    }


def apply_action(item, action, role, user, comment=""):
    """Return the next state of a request. Raises ApiError for illegal transitions."""
    action = str(action).upper()
    if action not in ("APPROVE", "REJECT"):
        raise ApiError(400, "action must be APPROVE or REJECT")
    if item["status"] != "PENDING":
        raise ApiError(409, f"request is already {item['status']}")
    if role != item["pendingRole"] and role != "Admin":
        raise ApiError(403, f"waiting on {item['pendingRole']}, not {role}")
    if item["type"] == "EXPENSE" and item["pendingRole"] == "Finance" and not item["attachments"]:
        raise ApiError(409, "Finance audit needs a receipt upload first")

    ts = now_ms()
    nxt = dict(item)
    nxt["history"] = item["history"] + [
        {"by": user, "role": role, "action": action, "comment": str(comment)[:500], "at": ts}
    ]
    nxt["updatedAt"] = ts
    nxt["version"] = item["version"] + 1
    chain = WORKFLOWS[item["type"]]
    if action == "REJECT":
        nxt.update(status="REJECTED", pendingRole=None, completedAt=ts)
    elif item["stage"] + 1 >= len(chain):
        nxt.update(status="COMPLETED", pendingRole=None, completedAt=ts,
                   outcome=COMPLETION_NOTE[item["type"]])
    else:
        nxt.update(stage=item["stage"] + 1, pendingRole=chain[item["stage"] + 1])
    return nxt


def is_synthetic(item):
    """The Raspberry Pi's load-test traffic. It is kept out of the human approval queues and the inbox."""
    return item.get("source") == "edge-pi"


def event_name(old, new):
    """Name of the domain event a state change represents (used by every audit ledger)."""
    if not old:
        return "RequestSubmitted"
    if new["status"] != old["status"]:
        return "Request" + new["status"].title()          # RequestCompleted / RequestRejected
    if new.get("escalatedStage") is not None and new.get("escalatedStage") != old.get("escalatedStage"):
        return "RequestEscalated"
    if new.get("pendingRole") != old.get("pendingRole"):
        return "RequestAdvanced"
    return "RequestUpdated"                                  # e.g. attachment added


def escalate(item, now, after_ms):
    """Flag a request that has waited longer than after_ms at its current stage (once per stage).

    Returns the next state, or None if nothing to do. Admins can act on any stage, so the
    escalation notice tells them where the bottleneck is.
    """
    if item["status"] != "PENDING" or item.get("escalatedStage") == item["stage"]:
        return None
    waiting_since = item["history"][-1]["at"] if item.get("history") else item["createdAt"]
    if now - waiting_since < after_ms:
        return None
    nxt = dict(item)
    nxt["history"] = item["history"] + [
        {"by": "system", "role": "System", "action": "ESCALATE",
         "comment": f"waiting on {item['pendingRole']} for {(now - waiting_since) // 60000} min", "at": now}]
    nxt.update(escalatedStage=item["stage"], escalatedAt=now, updatedAt=now, version=item["version"] + 1)
    return nxt


def summarize(item):
    out = dict(item)
    if item.get("completedAt"):
        out["turnaroundMs"] = item["completedAt"] - item["createdAt"]
    return out


# ---------------------------------------------------------------- HTTP routing

def _auth(headers, identity):
    role = headers.get("x-role", "Employee")
    if role not in ROLES:
        raise ApiError(403, f"unknown role {role}")
    if identity is not None:
        # RBAC from the Cognito groups in the verified token; X-Role only picks which hat to wear.
        groups = set(identity.get("groups") or [])
        if role != "Employee" and role not in groups and "Admin" not in groups:
            raise ApiError(403, f"{identity['user']} is not in the {role} group")
        return identity["user"], role
    if AUTH_MODE == "cognito":
        raise ApiError(401, "sign in first")
    token = os.environ.get("API_TOKEN", "")
    if token and headers.get("authorization", "") != f"Bearer {token}":
        raise ApiError(401, "missing or wrong bearer token")
    return headers.get("x-user", "anonymous")[:64], role


def auth_info():
    """Tells clients (dashboard, Pi) how to sign in to this cloud, so each stack is self-describing."""
    if AUTH_MODE != "cognito":
        return {"type": "token"}
    return {"type": "cognito", "region": os.environ.get("COGNITO_REGION", REGION),
            "clientId": os.environ.get("COGNITO_CLIENT_ID", "")}


def handle(method, path, headers, body, store, identity=None):
    """Route one API call. headers must have lower-case keys. Returns (status, dict).

    identity is {"user": ..., "groups": [...]} when the platform already verified a JWT.
    """
    headers = {k.lower(): v for k, v in (headers or {}).items()}
    parts = [p for p in path.split("/") if p]
    try:
        if method == "OPTIONS":
            return 204, {}
        if parts == ["health"]:
            return 200, {"status": "ok", "cloud": CLOUD, "region": REGION, "ts": now_ms(), "auth": auth_info()}

        user, role = _auth(headers, identity)
        data = {}
        if body:
            try:
                data = json.loads(body) if isinstance(body, (str, bytes)) else body
            except ValueError:
                raise ApiError(400, "body must be JSON")

        if parts == ["requests"] and method == "POST":
            item = new_request(data, user)
            store.create(item)
            return 201, summarize(item)

        if parts == ["requests", "mine"] and method == "GET":
            return 200, {"items": [summarize(i) for i in store.list_mine(user)]}

        if parts == ["requests"] and method == "GET":
            queue_role = headers.get("x-queue-role") or role
            items = store.list_pending(queue_role)
            return 200, {"role": queue_role, "items": [summarize(i) for i in items]}

        if len(parts) >= 2 and parts[0] == "requests":
            item = store.get(parts[1])
            if not item:
                raise ApiError(404, "request not found")

            if len(parts) == 2 and method == "GET":
                return 200, summarize(item)

            if parts[2:] == ["actions"] and method == "POST":
                if "version" in data and int(data["version"]) != item["version"]:
                    raise ApiError(409, "stale version, reload the request")
                nxt = apply_action(item, data.get("action"), role, user, data.get("comment", ""))
                if not store.update(nxt, expected_version=item["version"]):
                    raise ApiError(409, "concurrent update, reload the request")
                return 200, summarize(nxt)

            if parts[2:] == ["upload-url"] and method == "POST":
                name = str(data.get("filename", "receipt.pdf")).replace("/", "_")[:100]
                ctype = str(data.get("contentType", "application/octet-stream"))
                key = f"{item['id']}/{uuid.uuid4().hex[:8]}-{name}"
                url = store.upload_url(key, ctype)
                nxt = dict(item, attachments=item["attachments"] + [key],
                           version=item["version"] + 1, updatedAt=now_ms())
                if not store.update(nxt, expected_version=item["version"]):
                    raise ApiError(409, "concurrent update, retry")
                return 200, {"uploadUrl": url, "key": key, "method": "PUT", "contentType": ctype}

            if parts[2:] == ["audit"] and method == "GET":
                return 200, {"id": item["id"], "entries": store.list_audit(item["id"])}

        if parts == ["telemetry"] and method == "POST":
            if not isinstance(data, dict) or "node" not in data:
                raise ApiError(400, "telemetry needs a node field")
            data["receivedAt"] = now_ms()
            data["receivedBy"] = CLOUD
            store.put_telemetry(data)
            return 202, {"stored": True}

        if parts == ["telemetry"] and method == "GET":
            return 200, {"items": store.list_telemetry(limit=60)}

        if parts == ["stats"] and method == "GET":
            stats = getattr(store, "stats", None)          # not every adapter keeps counters
            return 200, {"items": stats() if stats else [], "targetTurnaroundMs": 2 * 3600 * 1000}

        raise ApiError(404, f"no route for {method} /{'/'.join(parts)}")
    except ApiError as e:
        return e.status, {"error": e.message}


def stats_rows(items):
    """Approval turnaround per (source, type): what the analytics module reports."""
    rows = {}
    for i in items:
        r = rows.setdefault((i.get("source", "web"), i["type"]), {
            "source": i.get("source", "web"), "type": i["type"], "submitted": 0, "completed": 0,
            "rejected": 0, "escalated": 0, "turnaroundSumMs": 0})
        r["submitted"] += 1
        r["escalated"] += 1 if i.get("escalatedStage") is not None else 0
        if i["status"] in ("COMPLETED", "REJECTED"):
            r["completed" if i["status"] == "COMPLETED" else "rejected"] += 1
            r["turnaroundSumMs"] += i["completedAt"] - i["createdAt"]
    return [finish_stats(r) for r in sorted(rows.values(), key=lambda r: (r["source"], r["type"]))]


def finish_stats(r):
    done = r["completed"] + r["rejected"]
    r["avgTurnaroundMs"] = round(r["turnaroundSumMs"] / done) if done else None
    return r


CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization,Content-Type,X-User,X-Role,X-Queue-Role",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Content-Type": "application/json",
}


class MemoryStore:
    """In-memory store for the local test server and unit tests."""

    def __init__(self):
        self.items, self.audit, self.telemetry = {}, {}, []
        self.upload_base = "http://localhost:8080"

    def _log(self, item, event):
        self.audit.setdefault(item["id"], []).append(
            {"at": now_ms(), "event": event, "status": item["status"], "version": item["version"]})

    def create(self, item):
        self.items[item["id"]] = item
        self._log(item, "RequestSubmitted")

    def get(self, rid):
        return self.items.get(rid)

    def update(self, item, expected_version):
        cur = self.items.get(item["id"])
        if not cur or cur["version"] != expected_version:
            return False
        self.items[item["id"]] = item
        self._log(item, event_name(cur, item))
        return True

    def list_pending(self, role):
        return sorted((i for i in self.items.values()
                       if i["status"] == "PENDING" and not is_synthetic(i)
                       and (role == "Admin" or i["pendingRole"] == role)),
                      key=lambda i: i["createdAt"])[:100]

    def list_mine(self, user):
        return sorted((i for i in self.items.values() if i["requester"] == user),
                      key=lambda i: -i["createdAt"])[:100]

    def list_audit(self, rid):
        return self.audit.get(rid, [])

    def upload_url(self, key, ctype):
        return f"{self.upload_base}/fake-upload/{key}"

    def put_telemetry(self, data):
        self.telemetry.append(data)

    def stats(self):
        return stats_rows(self.items.values())

    def list_telemetry(self, limit=60):
        return self.telemetry[-limit:][::-1]
