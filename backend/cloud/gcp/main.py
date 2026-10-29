"""GCP Cloud Functions (gen2) entry point: the secondary/failover copy of the same API, backed by Firestore."""
import json

import functions_framework
from google.cloud import firestore

from workflow_core import CORS_HEADERS, ApiError, event_name, handle, now_ms

DB = firestore.Client()


class FirestoreStore:
    def _audit(self, item, event):
        DB.collection("audit").document(item["id"]).collection("entries").add(
            {"at": now_ms(), "event": event, "status": item["status"], "version": item["version"],
             "actor": item["history"][-1]["by"], "actorRole": item["history"][-1]["role"]})

    def create(self, item):
        DB.collection("requests").document(item["id"]).create(item)
        self._audit(item, "RequestSubmitted")

    def get(self, rid):
        snap = DB.collection("requests").document(rid).get()
        return snap.to_dict() if snap.exists else None

    def update(self, item, expected_version):
        ref = DB.collection("requests").document(item["id"])

        @firestore.transactional
        def txn(tx):
            snap = ref.get(transaction=tx)
            if not snap.exists or snap.get("version") != expected_version:
                return None
            tx.set(ref, item)
            return snap.to_dict()

        old = txn(DB.transaction())
        if old:
            self._audit(item, event_name(old, item))
        return old is not None

    def list_pending(self, role):
        q = DB.collection("requests").where(filter=firestore.FieldFilter("status", "==", "PENDING"))
        if role != "Admin":
            q = q.where(filter=firestore.FieldFilter("pendingRole", "==", role))
        return sorted((d.to_dict() for d in q.limit(100).stream()), key=lambda i: i["createdAt"])

    def list_audit(self, rid):
        docs = DB.collection("audit").document(rid).collection("entries").stream()
        return sorted((d.to_dict() for d in docs), key=lambda e: e["at"])

    def upload_url(self, key, ctype):
        raise ApiError(503, "document uploads are paused while running on the failover cloud")

    def put_telemetry(self, data):
        DB.collection("telemetry").add(data)

    def list_telemetry(self, limit=60):
        q = DB.collection("telemetry").order_by("receivedAt", direction=firestore.Query.DESCENDING).limit(limit)
        return [d.to_dict() for d in q.stream()]


STORE = FirestoreStore()


@functions_framework.http
def api(request):
    status, payload = handle(request.method, request.path, dict(request.headers),
                             request.get_data(as_text=True), STORE)
    return json.dumps(payload), status, CORS_HEADERS
