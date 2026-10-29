# Serverless Cloud Application Architecture

This is an event-driven enterprise approval platform for four workflows: Purchase, Leave, Expense and IT Access. It runs on **AWS serverless**:
- Cognito
- API Gateway with a JWT authorizer
- Lambda
- DynamoDB
- S3
- EventBridge
- SNS
- CloudFront

A warm-standby DR stack takes over automatically. A **Raspberry Pi 3 Model B+** edge node generates real branch-office traffic, measures p95 latency from the edge, and triggers the failover and times it.

```
  React 18 web app (CloudFront)                Raspberry Pi 3 B+  (edge/prober.py)
  role-based screens, browser failover          synthetic workflows, p95 telemetry, failover timing
            |   Cognito sign-in (JWT)                     |
            v                                             v
 PRIMARY   API Gateway HTTP API: JWT authorizer, throttling 50 rps / burst 100
            |--> Lambda api.py ---------------> DynamoDB single table (optimistic locking, GSI approval queues)
            |      |-> S3 presigned upload (AES-256, versioned)      | Streams
            |                                                       v
            |                                Lambda audit_stream.py: write-once SHA-256 audit ledger,
            |                                turnaround counters, copy to DR table, EventBridge
            |                                        |--> rule --> SNS email (completed / rejected / escalated)
            |   EventBridge schedule (15 min) --> Lambda escalate.py: flags approvals stuck > 2 h
            |
            |  3 failed calls in a row (Pi) / 2 (browser)  ->  switch;  5 healthy checks  ->  switch back
            v
 DR        identical independent stack (own API, Lambda, table, user pool), data kept in sync
```

One engine, `cloud/core/workflow_core.py`, serves every stack (and the GCP and local adapters), so the clients can fail over without changing anything.

## What's in the folder

| Path | What it is |
|---|---|
| `cloud/core/workflow_core.py` | Workflow engine: approval chains, validation, RBAC, escalation, routing |
| `cloud/aws/template.yaml` | The whole AWS stack (SAM) |
| `cloud/aws/src/` | Lambda functions: `api.py` (REST API), `audit_stream.py` (ledger, stats, replication, events), `escalate.py` (scheduled) |
| `cloud/aws/deploy_all.sh` | One command to deploy: DR stack, primary stack, demo users, web app |
| `cloud/aws/chaos.sh` | Chaos drill: `down` takes the primary offline (Lambda concurrency 0), `up` restores it |
| `webapp/` | React 18 single-page app (`src/`), prebuilt in `dist/`, plus the S3 + CloudFront hosting stack |
| `edge/` | Raspberry Pi prober, systemd service, bootstrap script, `report.py` for the SMART numbers |
| `cloud/gcp/` | Cloud Functions + Firestore adapter for a GCP secondary (written, not deployed; see deviations) |
| `cloud/local/local_server.py` | Runs the API on a laptop, with simulated outages, for testing |
| `tests/` | 10 unit and integration tests (core engine, and the AWS Lambdas on moto) |
| `DEMO_DAY.md`, `RESULTS_SLIDE.md`, `COST_ANALYSIS.md` | Demo runbook, measured results, cost model |
| `README_v1_setup.md` | The first build's step-by-step setup (shared token, plain HTML dashboard in `dashboard/`) |

## Deploy (laptop, Windows MSYS2 / Git Bash, needs only the AWS CLI)

```bash
cd ~/capstone/cloud/aws
export AWS_REGION=ap-southeast-2
export DEMO_PASSWORD=...           # 8+ characters with a number; the same for every demo user
export NOTIFY_EMAIL=you@example.com   # optional: confirm the subscription email AWS sends
bash deploy_all.sh                 # about 10 minutes
```

It prints both API URLs and the web app URL, and creates these Cognito users:

| User | Can act as |
|---|---|
| employee1 | Employee: submit and track requests |
| manager1, procurement1, finance1, hr1, it1 | their department, plus Employee |
| admin1 | every stage, escalations |
| pi-edge-01 | the Raspberry Pi's service account (all approver groups) |

## Raspberry Pi

1. Flash Raspberry Pi OS Lite 64-bit with Imager. Set hostname `edge-pi`, user `pi`, your Wi-Fi (2.4 GHz) and SSH.
2. Copy `edge/` to the Pi and run `bash edge/bootstrap_pi.sh`. It installs python3-aiohttp and chrony, keeps the logs in RAM-friendly mode and installs the service.
3. Fill `edge/prober.env`: `PRIMARY_URL`, `SECONDARY_URL`, `COGNITO_USER=pi-edge-01` and `COGNITO_PASSWORD`. Then run `python3 prober.py --smoke` and `sudo systemctl enable --now edge-prober`.
4. To get results, run `python3 edge/report.py ~/edge-logs --last-run --out results`. It writes `report.md` and `latency.svg`.

Always shut down with `sudo poweroff` before unplugging. A power cut can corrupt the SD card.

## Tests

```bash
python3 -m venv .venv && .venv/bin/pip install boto3 "moto[dynamodb,s3,events]" pytest
.venv/bin/python -m pytest -q tests
```

## How the build maps to the eight modules in the methodology document

| Module | Implementation |
|---|---|
| 1. Authentication & RBAC | Cognito user pool with one group per role, optional TOTP MFA. API Gateway verifies the JWT, and the engine only lets a user act as a role in their groups |
| 2. Employee request module | React "My requests" screen with validation. Receipts go straight to S3 through a presigned URL |
| 3. Managerial approval engine | Approval queues per role (DynamoDB GSI), approve or reject with comments, optimistic locking, auto-escalation after 2 h |
| 4. Department action modules | Purchase (Manager → Procurement → Finance → PO), Leave (Manager → HR → calendar), Expense (receipt → Manager → Finance audit → disbursement), IT Access (Manager → IT provisioning) |
| 5. Event notification engine | DynamoDB Streams → EventBridge → SNS email for completed, rejected and escalated requests. The web app polls for live updates |
| 6. Immutable audit ledger | A stream consumer writes a write-once entry per state change with actor, role, comment and the SHA-256 of the record |
| 7. Document storage engine | S3 with AES-256, versioning, public access blocked, 15-minute presigned PUT URLs |
| 8. Telemetry & analytics | The Pi reports p50/p95/p99, errors, failovers, CPU temperature and Wi-Fi each minute. `/stats` reports approval turnaround against the 2 h target |

## Honest deviations (say these in the review)

- **Hardware:** Raspberry Pi 3 B+ with a 16 GB Class 6 card, instead of a Pi 4 with an SSD. The prober is light (about 40 MB of RAM at 500 req/min).
- **Secondary cloud:** the AWS organization's SCP only allows ap-southeast-2. So the DR target is a second, fully independent AWS stack in the same region, instead of GCP. The GCP adapter (`cloud/gcp/`) uses the same engine and is ready, but it was not deployed.
- **Failover routing:** clients switch (the Pi after 3 failures, the browser after 2) instead of Route 53, which needs a registered domain. The Pi's short DNS cache means a Route 53 failover record would also work.
- **Replication:** one-way, primary → DR, near real-time through Streams. Writes made on DR during an outage are not copied back automatically. S3 receipts are not replicated.
- **Synthetic traffic isolation:** the Pi's load-test requests live in their own queue partition. They never appear in people's approval queues or inboxes, but they do count in the analytics, where they are labelled as Pi traffic.
- **IaC:** AWS SAM / CloudFormation instead of Terraform.
- **Notifications:** email through SNS. There are no SMS or WebSocket push messages; the web app polls every 10–15 s instead.

## Clean-up after grading

Delete the CloudFormation stacks `capstone-web`, `capstone-v2`, `capstone-v2-dr` and the older `capstone-workflow` and `capstone-workflow-dr`. Empty the web and document buckets first if a deletion stalls. Then delete the IAM access key.
