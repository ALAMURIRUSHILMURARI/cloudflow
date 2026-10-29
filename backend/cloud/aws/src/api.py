"""AWS Lambda entry point behind API Gateway (HTTP API, payload v2)."""
import json
import os
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key
from botocore.config import Config
from botocore.exceptions import ClientError

from workflow_core import CORS_HEADERS, finish_stats, handle, is_synthetic

TABLE = boto3.resource("dynamodb").Table(os.environ["TABLE_NAME"])
_REGION = os.environ.get("AWS_REGION", "ap-south-1")
# Regional virtual-hosted endpoint so presigned URLs work immediately for new buckets outside us-east-1.
S3 = boto3.client("s3", region_name=_REGION, endpoint_url=f"https://s3.{_REGION}.amazonaws.com",
                  config=Config(signature_version="s3v4", s3={"addressing_style": "virtual"}))
BUCKET = os.environ.get("BUCKET_NAME", "")


def _to_ddb(obj):
    return json.loads(json.dumps(obj), parse_float=Decimal)


def _from_ddb(obj):
    if isinstance(obj, list):
        return [_from_ddb(v) for v in obj]
    if isinstance(obj, dict):
        return {k: _from_ddb(v) for k, v in obj.items()}
    if isinstance(obj, Decimal):
        return int(obj) if obj == obj.to_integral_value() else float(obj)
    return obj


def _strip_keys(item):
    return {k: v for k, v in item.items() if k not in ("pk", "sk", "gsi1pk", "gsi1sk", "gsi2pk", "gsi2sk")}


class DynamoStore:
    """Single-table design.

    REQ#<id> / META            the request (stream triggers audit + EventBridge)
    REQ#<id> / AUDIT#<ts>#...  immutable audit entries written by the stream function
    TEL#<node> / <ts>          edge telemetry summaries from the Raspberry Pi
    GSI1: PENDING#<role> / <createdAt>  the approval queue for each role
          (the Pi's synthetic load goes to PENDING#<role>#edge-pi so it never buries human requests)
    GSI2: USER#<requester> / <createdAt>  "my requests" (people only, not the Pi's load)
    """

    def _record(self, item):
        rec = dict(_to_ddb(item), pk=f"REQ#{item['id']}", sk="META")
        if item["status"] == "PENDING":
            rec["gsi1pk"] = f"PENDING#{item['pendingRole']}" + ("#edge-pi" if is_synthetic(item) else "")
            rec["gsi1sk"] = item["createdAt"]
        if not is_synthetic(item):
            rec["gsi2pk"] = f"USER#{item['requester']}"
            rec["gsi2sk"] = item["createdAt"]
        return rec

    def create(self, item):
        TABLE.put_item(Item=self._record(item), ConditionExpression="attribute_not_exists(pk)")

    def get(self, rid):
        res = TABLE.get_item(Key={"pk": f"REQ#{rid}", "sk": "META"})
        return _from_ddb(_strip_keys(res["Item"])) if "Item" in res else None

    def update(self, item, expected_version):
        # Optimistic locking: the write only lands if nobody else bumped the version.
        try:
            TABLE.put_item(Item=self._record(item), ConditionExpression="version = :v",
                           ExpressionAttributeValues={":v": expected_version})
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                return False
            raise

    def list_pending(self, role):
        if role == "Admin":
            items = []
            for r in ("Manager", "Procurement", "Finance", "HR", "IT"):
                items += self.list_pending(r)
            return sorted(items, key=lambda i: i["createdAt"])[:100]
        res = TABLE.query(IndexName="gsi1", KeyConditionExpression=Key("gsi1pk").eq(f"PENDING#{role}"),
                          Limit=100)
        return [_from_ddb(_strip_keys(i)) for i in res["Items"]]

    def list_mine(self, user):
        res = TABLE.query(IndexName="gsi2", KeyConditionExpression=Key("gsi2pk").eq(f"USER#{user}"),
                          ScanIndexForward=False, Limit=100)
        return [_from_ddb(_strip_keys(i)) for i in res["Items"]]

    def list_audit(self, rid):
        res = TABLE.query(KeyConditionExpression=Key("pk").eq(f"REQ#{rid}") & Key("sk").begins_with("AUDIT#"))
        return [_from_ddb(_strip_keys(i)) for i in res["Items"]]

    def upload_url(self, key, ctype):
        return S3.generate_presigned_url("put_object", Params={"Bucket": BUCKET, "Key": key, "ContentType": ctype},
                                         ExpiresIn=900)

    def put_telemetry(self, data):
        TABLE.put_item(Item=dict(_to_ddb(data), pk=f"TEL#{data['node']}", sk=str(data["receivedAt"]),
                                 ttl=int(data["receivedAt"] / 1000) + 30 * 86400))

    def stats(self):
        # Counters kept by the stream function (pk=STATS, sk=<source>#<type>): O(1) instead of a scan.
        res = TABLE.query(KeyConditionExpression=Key("pk").eq("STATS"))
        rows = []
        for i in res["Items"]:
            r = _from_ddb(_strip_keys(i))
            r["source"], r["type"] = i["sk"].split("#", 1)
            for k in ("submitted", "completed", "rejected", "escalated", "turnaroundSumMs"):
                r.setdefault(k, 0)
            rows.append(finish_stats(r))
        return sorted(rows, key=lambda r: (r["source"], r["type"]))

    def list_telemetry(self, limit=60):
        node = os.environ.get("DEFAULT_NODE", "pi-edge-01")
        res = TABLE.query(KeyConditionExpression=Key("pk").eq(f"TEL#{node}"), ScanIndexForward=False, Limit=limit)
        return [_from_ddb(_strip_keys(i)) for i in res["Items"]]


STORE = DynamoStore()


def identity_from(event):
    """Claims of the Cognito JWT that API Gateway already verified (None on unauthenticated routes)."""
    claims = event.get("requestContext", {}).get("authorizer", {}).get("jwt", {}).get("claims")
    if not claims:
        return None
    groups = claims.get("cognito:groups") or []
    if isinstance(groups, str):                  # HTTP API flattens the list to "[Manager Finance]"
        groups = groups.strip("[]").replace(",", " ").split()
    return {"user": claims.get("cognito:username") or claims.get("username") or claims.get("sub"),
            "groups": groups}


def lambda_handler(event, context):
    http = event.get("requestContext", {}).get("http", {})
    body = event.get("body")
    if body and event.get("isBase64Encoded"):
        import base64
        body = base64.b64decode(body).decode()
    identity = identity_from(event)
    status, payload = handle(http.get("method", "GET"), event.get("rawPath", "/"),
                             event.get("headers") or {}, body, STORE, identity=identity)
    return {"statusCode": status, "headers": CORS_HEADERS, "body": json.dumps(payload)}
