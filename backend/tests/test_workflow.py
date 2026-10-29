"""Unit + integration tests. Run from the repo root:  python3 -m pytest -q tests   (or python3 tests/test_workflow.py)

The AWS test uses moto to fake DynamoDB/S3/EventBridge; it is skipped if boto3/moto are not installed.
"""
import json
import os
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "cloud", "core"))
import workflow_core as wc  # noqa: E402

H = lambda role, user="u1": {"X-Role": role, "X-User": user}


class CoreTests(unittest.TestCase):
    def setUp(self):
        os.environ.pop("API_TOKEN", None)
        self.s = wc.MemoryStore()

    def call(self, method, path, role="Employee", body=None):
        return wc.handle(method, path, H(role), json.dumps(body) if body else None, self.s)

    def test_purchase_full_chain(self):
        st, r = self.call("POST", "/requests", body={"type": "PURCHASE", "title": "Laptop", "amount": 1200})
        self.assertEqual(st, 201)
        for role in ["Manager", "Procurement", "Finance"]:
            self.assertEqual(r["pendingRole"], role)
            st, r = self.call("POST", f"/requests/{r['id']}/actions", role,
                              {"action": "approve", "version": r["version"]})
            self.assertEqual(st, 200, r)
        self.assertEqual(r["status"], "COMPLETED")
        self.assertIn("turnaroundMs", r)
        self.assertEqual(len(self.s.list_audit(r["id"])), 4)

    def test_wrong_role_is_forbidden(self):
        _, r = self.call("POST", "/requests", body={"type": "LEAVE", "title": "Vacation"})
        st, _ = self.call("POST", f"/requests/{r['id']}/actions", "HR", {"action": "APPROVE"})
        self.assertEqual(st, 403)

    def test_stale_version_conflict(self):
        _, r = self.call("POST", "/requests", body={"type": "LEAVE", "title": "Vacation"})
        self.call("POST", f"/requests/{r['id']}/actions", "Manager", {"action": "APPROVE", "version": 1})
        st, _ = self.call("POST", f"/requests/{r['id']}/actions", "Manager", {"action": "APPROVE", "version": 1})
        self.assertEqual(st, 409)

    def test_expense_needs_receipt_before_finance(self):
        _, r = self.call("POST", "/requests", body={"type": "EXPENSE", "title": "Taxi", "amount": 30})
        _, r = self.call("POST", f"/requests/{r['id']}/actions", "Manager", {"action": "APPROVE"})
        st, _ = self.call("POST", f"/requests/{r['id']}/actions", "Finance", {"action": "APPROVE"})
        self.assertEqual(st, 409)
        st, up = self.call("POST", f"/requests/{r['id']}/upload-url", body={"filename": "r.pdf"})
        self.assertEqual(st, 200)
        st, r = self.call("POST", f"/requests/{r['id']}/actions", "Finance", {"action": "APPROVE"})
        self.assertEqual((st, r["status"]), (200, "COMPLETED"))

    def test_validation_and_auth(self):
        self.assertEqual(self.call("POST", "/requests", body={"type": "NOPE", "title": "x"})[0], 400)
        self.assertEqual(self.call("POST", "/requests", body={"type": "PURCHASE", "title": "No amount"})[0], 400)
        os.environ["API_TOKEN"] = "secret-token-123456"
        self.assertEqual(self.call("GET", "/requests")[0], 401)
        self.assertEqual(self.call("GET", "/health")[0], 200)
        st, _ = wc.handle("GET", "/requests", {"Authorization": "Bearer secret-token-123456"}, None, self.s)
        self.assertEqual(st, 200)

    def test_queue_and_reject(self):
        _, a = self.call("POST", "/requests", body={"type": "IT_ACCESS", "title": "VPN access"})
        _, q = self.call("GET", "/requests", "Manager")
        self.assertEqual([i["id"] for i in q["items"]], [a["id"]])
        _, a = self.call("POST", f"/requests/{a['id']}/actions", "Manager", {"action": "REJECT"})
        self.assertEqual(a["status"], "REJECTED")
        self.assertEqual(self.call("GET", "/requests", "Manager")[1]["items"], [])

    def test_cognito_groups_decide_roles(self):
        me = {"user": "manager1", "groups": ["Manager"]}
        st, r = wc.handle("POST", "/requests", {}, json.dumps({"type": "LEAVE", "title": "Vacation"}), self.s,
                          identity={"user": "employee1", "groups": []})
        self.assertEqual((st, r["requester"]), (201, "employee1"))
        st, _ = wc.handle("POST", f"/requests/{r['id']}/actions", {"X-Role": "HR"}, '{"action":"APPROVE"}',
                          self.s, identity=me)
        self.assertEqual(st, 403)                                  # not in the HR group
        st, r = wc.handle("POST", f"/requests/{r['id']}/actions", {"X-Role": "Manager"}, '{"action":"APPROVE"}',
                          self.s, identity=me)
        self.assertEqual((st, r["pendingRole"], r["history"][-1]["by"]), (200, "HR", "manager1"))
        old = wc.AUTH_MODE
        try:
            wc.AUTH_MODE = "cognito"
            self.assertEqual(self.call("GET", "/requests")[0], 401)   # no verified token, no access
            self.assertEqual(self.call("GET", "/health")[1]["auth"]["type"], "cognito")
        finally:
            wc.AUTH_MODE = old

    def test_escalation_once_per_stage(self):
        _, r = self.call("POST", "/requests", body={"type": "PURCHASE", "title": "Laptop", "amount": 900})
        item = self.s.get(r["id"])
        t0 = item["createdAt"]
        self.assertIsNone(wc.escalate(item, t0 + 60_000, 120 * 60_000))         # not overdue yet
        nxt = wc.escalate(item, t0 + 121 * 60_000, 120 * 60_000)
        self.assertEqual((nxt["escalatedStage"], nxt["history"][-1]["action"]), (0, "ESCALATE"))
        self.assertEqual(wc.event_name(item, nxt), "RequestEscalated")
        self.assertTrue(self.s.update(nxt, item["version"]))
        self.assertIsNone(wc.escalate(nxt, t0 + 300 * 60_000, 120 * 60_000))    # only once per stage
        _, r = self.call("POST", f"/requests/{r['id']}/actions", "Manager", {"action": "APPROVE"})
        self.assertIsNotNone(wc.escalate(self.s.get(r["id"]), t0 + 500 * 60_000, 120 * 60_000))

    def test_form_data_and_my_requests(self):
        body = {"type": "PURCHASE", "title": "Jetson", "amount": 1200, "priority": "High",
                "data": {"quantity": 2, "category": "Hardware"},
                "requesterProfile": {"name": "Alex", "email": "a@x.io", "evil": "x" * 500}}
        st, r = self.call("POST", "/requests", body=body)
        self.assertEqual((st, r["priority"], r["data"]["quantity"]), (201, "High", 2))
        self.assertNotIn("evil", r["requesterProfile"])
        self.call("POST", "/requests", body={"type": "LEAVE", "title": "Other"})
        wc.handle("POST", "/requests", H("Employee", "u2"), '{"type":"LEAVE","title":"Not mine"}', self.s)
        st, out = self.call("GET", "/requests/mine")
        self.assertEqual((st, sorted(i["title"] for i in out["items"])), (200, ["Jetson", "Other"]))
        self.assertEqual(self.call("POST", "/requests", body={"type": "LEAVE", "title": "x", "data": [1]})[0], 400)
        big = {"type": "LEAVE", "title": "x", "data": {"k": "y" * 9000}}
        self.assertEqual(self.call("POST", "/requests", body=big)[0], 400)

    def test_stats(self):
        _, r = self.call("POST", "/requests", body={"type": "LEAVE", "title": "Vacation"})
        for role in ["Manager", "HR"]:
            self.call("POST", f"/requests/{r['id']}/actions", role, {"action": "APPROVE"})
        self.call("POST", "/requests", body={"type": "LEAVE", "title": "Sick day"})
        st, out = self.call("GET", "/stats")
        row = out["items"][0]
        self.assertEqual((st, row["source"], row["submitted"], row["completed"]), (200, "web", 2, 1))
        self.assertIsNotNone(row["avgTurnaroundMs"])


try:
    import boto3
    from moto import mock_aws
except ImportError:
    mock_aws = None


@unittest.skipIf(mock_aws is None, "boto3/moto not installed")
class AwsTests(unittest.TestCase):
    def test_lambda_and_stream_on_moto(self):
        with mock_aws():
            os.environ.update(AWS_DEFAULT_REGION="ap-south-1", AWS_REGION="ap-south-1", TABLE_NAME="wf",
                              BUCKET_NAME="docs", EVENT_BUS_NAME="bus", API_TOKEN="tok-1234567890abcdef")
            ddb = boto3.client("dynamodb")
            ddb.create_table(
                TableName="wf", BillingMode="PAY_PER_REQUEST",
                AttributeDefinitions=[{"AttributeName": n, "AttributeType": t} for n, t in
                                      [("pk", "S"), ("sk", "S"), ("gsi1pk", "S"), ("gsi1sk", "N"),
                                       ("gsi2pk", "S"), ("gsi2sk", "N")]],
                KeySchema=[{"AttributeName": "pk", "KeyType": "HASH"}, {"AttributeName": "sk", "KeyType": "RANGE"}],
                GlobalSecondaryIndexes=[{"IndexName": "gsi1", "Projection": {"ProjectionType": "ALL"},
                                         "KeySchema": [{"AttributeName": "gsi1pk", "KeyType": "HASH"},
                                                       {"AttributeName": "gsi1sk", "KeyType": "RANGE"}]},
                                        {"IndexName": "gsi2", "Projection": {"ProjectionType": "ALL"},
                                         "KeySchema": [{"AttributeName": "gsi2pk", "KeyType": "HASH"},
                                                       {"AttributeName": "gsi2sk", "KeyType": "RANGE"}]}])
            boto3.client("s3").create_bucket(Bucket="docs",
                                             CreateBucketConfiguration={"LocationConstraint": "ap-south-1"})
            boto3.client("events").create_event_bus(Name="bus")
            sys.path.insert(0, os.path.join(ROOT, "cloud", "aws", "src"))
            import api
            import audit_stream
            wc.CLOUD = "aws"  # core was imported before CLOUD_NAME was set

            def ev(method, path, role="Employee", body=None):
                res = api.lambda_handler({"requestContext": {"http": {"method": method}}, "rawPath": path,
                                          "headers": {"authorization": "Bearer tok-1234567890abcdef",
                                                      "x-role": role, "x-user": "t"},
                                          "body": json.dumps(body) if body else None}, None)
                return res["statusCode"], json.loads(res["body"])

            self.assertEqual(ev("GET", "/health")[1]["cloud"], "aws")
            st, r = ev("POST", "/requests", body={"type": "EXPENSE", "title": "Hotel", "amount": 99.95})
            self.assertEqual(st, 201)
            self.assertEqual(r["amount"], 99.95)
            self.assertEqual(ev("GET", "/requests", "Manager")[1]["items"][0]["id"], r["id"])
            self.assertEqual(ev("GET", "/requests/mine")[1]["items"][0]["id"], r["id"])
            st, r = ev("POST", f"/requests/{r['id']}/actions", "Manager", {"action": "APPROVE", "version": 1})
            self.assertEqual((st, r["pendingRole"]), (200, "Finance"))
            self.assertEqual(ev("GET", "/requests", "Manager")[1]["items"], [])
            st, up = ev("POST", f"/requests/{r['id']}/upload-url", body={"filename": "r.pdf",
                                                                          "contentType": "application/pdf"})
            self.assertTrue(up["uploadUrl"].startswith("https://docs.s3.ap-south-1.amazonaws.com/"), up)
            st, r = ev("POST", f"/requests/{r['id']}/actions", "Finance", {"action": "APPROVE"})
            self.assertEqual(r["status"], "COMPLETED")
            self.assertEqual(ev("POST", "/telemetry", body={"node": "pi-edge-01", "p95": 300})[0], 202)
            self.assertEqual(ev("GET", "/telemetry")[1]["items"][0]["p95"], 300)

            # Feed a synthetic stream record (what DynamoDB Streams would deliver) to the audit function.
            from boto3.dynamodb.types import TypeSerializer
            ser = TypeSerializer()
            raw = boto3.resource("dynamodb").Table("wf").get_item(Key={"pk": f"REQ#{r['id']}", "sk": "META"})["Item"]
            old = dict(raw, status="PENDING", pendingRole="Finance")
            rec = {"eventID": "e1", "dynamodb": {"NewImage": {k: ser.serialize(v) for k, v in raw.items()},
                                                 "OldImage": {k: ser.serialize(v) for k, v in old.items()}}}
            self.assertEqual(audit_stream.lambda_handler({"Records": [rec, rec]}, None)["processed"], 2)
            st, audit = ev("GET", f"/requests/{r['id']}/audit")
            self.assertEqual(len(audit["entries"]), 1)          # write-once even when redelivered
            self.assertEqual(audit["entries"][0]["event"], "RequestCompleted")
            self.assertEqual(len(audit["entries"][0]["sha256"]), 64)

            # Turnaround counters were bumped once (the redelivered record did not count twice).
            st, stats = ev("GET", "/stats")
            self.assertEqual([(x["type"], x["completed"]) for x in stats["items"]], [("EXPENSE", 1)])

            # Replication: the same stream record lands in the DR table, and an older copy never wins.
            ddb.create_table(TableName="wf-dr", BillingMode="PAY_PER_REQUEST",
                             AttributeDefinitions=[{"AttributeName": "pk", "AttributeType": "S"},
                                                   {"AttributeName": "sk", "AttributeType": "S"}],
                             KeySchema=[{"AttributeName": "pk", "KeyType": "HASH"},
                                        {"AttributeName": "sk", "KeyType": "RANGE"}])
            audit_stream.REPLICA = "wf-dr"
            audit_stream.lambda_handler({"Records": [dict(rec, eventID="e2")]}, None)
            older = dict(rec["dynamodb"]["NewImage"], version={"N": "1"}, status={"S": "PENDING"})
            audit_stream.replicate(older)
            dr = boto3.resource("dynamodb").Table("wf-dr").get_item(Key={"pk": f"REQ#{r['id']}", "sk": "META"})["Item"]
            self.assertEqual(dr["status"], "COMPLETED")

            # Cognito mode: identity comes from the JWT claims API Gateway verified.
            wc.AUTH_MODE = "cognito"
            try:
                def jwt_ev(method, path, role, groups, body=None):
                    res = api.lambda_handler({"requestContext": {"http": {"method": method}, "authorizer": {"jwt": {
                        "claims": {"cognito:username": "manager1", "cognito:groups": groups}}}},
                        "rawPath": path, "headers": {"x-role": role},
                        "body": json.dumps(body) if body else None}, None)
                    return res["statusCode"], json.loads(res["body"])
                st, q = jwt_ev("GET", "/requests", "Manager", "[Manager]")
                self.assertEqual(st, 200)
                self.assertEqual(jwt_ev("GET", "/requests", "Finance", "[Manager]")[0], 403)
                self.assertEqual(ev("GET", "/requests")[0], 401)          # bearer token alone no longer works
            finally:
                wc.AUTH_MODE = "token"

            # Escalation: a request created 3 hours ago is flagged by the scheduled function.
            st, r = ev("POST", "/requests", body={"type": "LEAVE", "title": "Old request"})
            tbl = boto3.resource("dynamodb").Table("wf")
            old_ts = r["createdAt"] - 3 * 3600 * 1000
            item = tbl.get_item(Key={"pk": f"REQ#{r['id']}", "sk": "META"})["Item"]
            item["createdAt"] = item["gsi1sk"] = old_ts
            item["history"][0]["at"] = old_ts
            tbl.put_item(Item=item)
            import escalate
            self.assertEqual(escalate.lambda_handler({}, None)["escalated"], 1)
            self.assertEqual(escalate.lambda_handler({}, None)["escalated"], 0)
            self.assertEqual(ev("GET", f"/requests/{r['id']}")[1]["escalatedStage"], 0)


if __name__ == "__main__":
    unittest.main()
