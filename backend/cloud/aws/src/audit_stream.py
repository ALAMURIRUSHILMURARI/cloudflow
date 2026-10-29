"""DynamoDB Streams consumer: writes the immutable audit ledger, keeps the turnaround counters,
copies requests to the DR stack's table and fans events out to EventBridge.

Runs off the API's critical path, so approvals return immediately (spec section 5, step 4).
"""
import hashlib
import json
import os

import boto3
from boto3.dynamodb.types import TypeDeserializer

from workflow_core import event_name

TABLE = boto3.resource("dynamodb").Table(os.environ["TABLE_NAME"])
EVENTS = boto3.client("events")
BUS = os.environ["EVENT_BUS_NAME"]
REPLICA = os.environ.get("REPLICA_TABLE", "")
DDB = boto3.client("dynamodb")
_des = TypeDeserializer()


def _plain(image):
    def conv(v):
        if isinstance(v, dict):
            return {k: conv(x) for k, x in v.items()}
        if isinstance(v, (list, set)):
            return [conv(x) for x in v]
        if hasattr(v, "to_integral_value"):
            return int(v) if v == v.to_integral_value() else float(v)
        return v
    return {k: conv(_des.deserialize(v)) for k, v in image.items()}


def count(new, name):
    """Turnaround counters per (source, type), read by GET /stats."""
    adds = {"RequestSubmitted": {"submitted": 1}, "RequestEscalated": {"escalated": 1},
            "RequestRejected": {"rejected": 1}, "RequestCompleted": {"completed": 1}}.get(name)
    if not adds:
        return
    if name in ("RequestCompleted", "RequestRejected") and new.get("completedAt"):
        adds["turnaroundSumMs"] = new["completedAt"] - new["createdAt"]
    TABLE.update_item(
        Key={"pk": "STATS", "sk": f"{new.get('source') or 'web'}#{new['type']}"},
        UpdateExpression="ADD " + ", ".join(f"{k} :{k}" for k in adds),
        ExpressionAttributeValues={f":{k}": v for k, v in adds.items()})


def replicate(image):
    """Warm standby: copy the request to the DR table unless the DR copy is already newer."""
    try:
        DDB.put_item(TableName=REPLICA, Item=image,
                     ConditionExpression="attribute_not_exists(pk) OR version < :v",
                     ExpressionAttributeValues={":v": image["version"]})
    except DDB.exceptions.ConditionalCheckFailedException:
        pass


def lambda_handler(event, context):
    entries = []
    for rec in event["Records"]:
        ddb = rec["dynamodb"]
        new = _plain(ddb.get("NewImage", {}))
        old = _plain(ddb.get("OldImage", {})) if ddb.get("OldImage") else None
        if not new or new.get("sk") != "META":
            continue
        if REPLICA:
            replicate(ddb["NewImage"])
        name = event_name(old, new)
        digest = hashlib.sha256(json.dumps(new, sort_keys=True, default=str).encode()).hexdigest()
        last = new["history"][-1] if new.get("history") else {}
        first_delivery = True
        try:
            TABLE.put_item(
                Item={
                    "pk": new["pk"],
                    "sk": f"AUDIT#{new['updatedAt']}#{rec['eventID']}",
                    "event": name,
                    "status": new["status"],
                    "version": new["version"],
                    "actor": last.get("by", "system"),
                    "actorRole": last.get("role", ""),
                    "comment": last.get("comment", ""),
                    "sha256": digest,
                    "at": new["updatedAt"],
                },
                ConditionExpression="attribute_not_exists(sk)",   # write-once
            )
        except TABLE.meta.client.exceptions.ConditionalCheckFailedException:
            first_delivery = False  # already written by an earlier attempt of this batch
        if first_delivery:
            count(new, name)
        detail = {k: new.get(k) for k in ("id", "type", "title", "status", "pendingRole", "stage",
                                           "requester", "amount", "createdAt", "completedAt", "source")}
        entries.append({"Source": "capstone.workflow", "DetailType": name,
                        "Detail": json.dumps(detail, default=str), "EventBusName": BUS})
    for i in range(0, len(entries), 10):
        res = EVENTS.put_events(Entries=entries[i:i + 10])
        if res.get("FailedEntryCount"):
            raise RuntimeError(f"EventBridge rejected {res['FailedEntryCount']} events")  # stream retries, then DLQ
    return {"processed": len(entries)}
