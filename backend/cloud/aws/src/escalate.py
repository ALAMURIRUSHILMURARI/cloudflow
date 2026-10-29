"""Scheduled every 15 minutes: flags approvals that have sat at one stage too long (module 3, auto-escalation).

The update goes through the normal optimistic-locking write, so the stream function records a
RequestEscalated audit entry and EventBridge emails the escalation notice.
"""
import os

from boto3.dynamodb.conditions import Key

from api import TABLE, DynamoStore, _from_ddb, _strip_keys
from workflow_core import WORKFLOWS, escalate, now_ms

AFTER_MS = int(float(os.environ.get("ESCALATE_AFTER_MIN", "120")) * 60000)
STORE = DynamoStore()


def lambda_handler(event, context):
    if AFTER_MS <= 0:                       # disabled on the DR stack: its rows are copies of the primary's
        return {"escalated": 0}
    now = now_ms()
    escalated = 0
    for role in sorted({r for chain in WORKFLOWS.values() for r in chain}):
        # gsi1sk is createdAt, so anything newer than the threshold cannot be overdue yet.
        res = TABLE.query(IndexName="gsi1", Limit=200, ScanIndexForward=False,   # newest overdue first
                          KeyConditionExpression=Key("gsi1pk").eq(f"PENDING#{role}") & Key("gsi1sk").lt(now - AFTER_MS))
        for raw in res["Items"]:
            item = _from_ddb(_strip_keys(raw))
            nxt = escalate(item, now, AFTER_MS)
            if nxt and STORE.update(nxt, expected_version=item["version"]):
                escalated += 1
    print(f"escalated {escalated} requests older than {AFTER_MS // 60000} min at their stage")
    return {"escalated": escalated}
