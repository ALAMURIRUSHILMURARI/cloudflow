# Serverless Cloud Application Architecture: working build

Event-driven enterprise workflow platform (Purchase, Leave, Expense, IT Access) on **AWS Lambda + API Gateway + DynamoDB + S3 + EventBridge + SNS**, with a **GCP Cloud Functions + Firestore** failover copy, and a **Raspberry Pi 3 Model B+** edge node that generates synthetic branch-office traffic, measures p95 latency, and performs and times the AWS to GCP failover.

```
 Raspberry Pi 3 B+ (edge/prober.py)          laptop browser (dashboard/index.html)
   synthetic workflows, p95 telemetry, failover          |
            |  HTTPS + bearer token                       |
            v                                             v
   PRIMARY  API Gateway (HTTP API, throttling, CORS) --> Lambda api.py --> DynamoDB (single table, optimistic locking)
            |                                                 |                 | Streams
            |                                                 +--> S3 presigned |--> Lambda audit_stream.py
            |                                                      (AES-256)    |     write-once audit ledger (sha256)
            |                                                                   +--> EventBridge bus --> rule --> SNS email
            |  primary fails 3x in a row (or health check fails)
            v
   SECONDARY  Cloud Functions gen2 main.py --> Firestore (transactions, audit sub-collection)
```

Both clouds run the **same engine** (`cloud/core/workflow_core.py`) behind the same REST contract, so the Pi switches clouds without changing anything.

---

## 4-hour plan

| Time | Laptop | Raspberry Pi |
|---|---|---|
| 0:00 to 0:25 | Install AWS CLI, SAM CLI, gcloud; `aws configure`; generate the token | Flash the card with OS customisation (step 1). Card flashes while you set up the laptop |
| 0:25 to 1:00 | **Deploy AWS** (step 3), smoke test with curl and the dashboard | First boot, SSH in, run `bootstrap_pi.sh` (step 2) |
| 1:00 to 1:30 | Open the dashboard, walk one request of each type through its chain, take screenshots | Copy `edge/`, fill `prober.env` with the AWS URL only, run `--smoke`, then start the service |
| 1:30 to 2:15 | **Deploy GCP** (step 5). If GCP billing blocks you, use plan B in step 5 | Add `SECONDARY_URL`, rerun `--smoke` (now walks both clouds), restart the service |
| 2:15 to 3:00 | **Benchmarks + chaos drill** (step 6): 60, 300 and 500 req/min runs; `chaos.sh down` and `up` | Prober logs everything; run `report.py` |
| 3:00 to 3:40 | Put `report.md` numbers and `latency.svg` into the slides; update hardware slide to Pi 3 B+ | Leave the prober running at 60 req/min for the live demo |
| 3:40 to 4:00 | Buffer. Rehearse the demo: dashboard, `chaos.sh down`, watch the Pi fail over, `chaos.sh up`, failback | |

If you are short on time, cut in this order: GCP (use plan B), SNS email, the 500 req/min run. Everything else is required for a working demo.

---

## 0. Laptop prerequisites (about 20 minutes)

Full click-by-click version for a brand new AWS account: [STEP0_AWS_SETUP.md](STEP0_AWS_SETUP.md).

- AWS account (free tier or credits) and **AWS CLI v2** installed (the SAM CLI is optional). Run `aws configure` with an IAM user's access key, region `ap-south-1` (Mumbai; any region works).
- Google Cloud account with a project that has **billing enabled** (needed for Cloud Functions even inside the free tier) and the **gcloud CLI** (`gcloud auth login`).
- Raspberry Pi Imager (raspberrypi.com/software).
- Generate one shared API token and keep it for every step:
  ```bash
  export API_TOKEN=$(python3 -c "import secrets; print(secrets.token_hex(16))"); echo $API_TOKEN
  ```

## 1. Flash the 16 GB card headless (about 15 minutes, mostly waiting)

1. Put the microSD in the USB reader and plug it into the laptop.
2. Open Raspberry Pi Imager. Device: **Raspberry Pi 3**. OS: **Raspberry Pi OS (other) → Raspberry Pi OS Lite (64-bit)**. Lite has no desktop, which matters with 1 GB RAM and a Class 6 card. Storage: the card.
3. When Imager offers **OS customisation**, set:
   - hostname `edge-pi`
   - username `pi` and a password
   - Wi-Fi SSID, password and **Wireless LAN country** (`IN` or yours). The 3 B+ supports 2.4 and 5 GHz. Ethernet also works and needs no Wi-Fi setup.
   - locale and time zone
   - Services: **Enable SSH, use password authentication**
4. Write and let it verify. A Class 6 card is slow, so expect 8 to 15 minutes.
5. Put the card in the Pi and power it with the **5 V / 2.5 A** micro-USB supply (that is the official rating for the 3 B+; weaker phone chargers cause under-voltage resets). First boot takes 2 to 3 minutes.

## 2. First login and bootstrap (about 10 minutes)

```bash
ssh pi@edge-pi.local            # if .local doesn't resolve, find the IP in your router's client list
```
From the laptop, copy the edge code over (run in the folder that contains `capstone/`):
```bash
ssh pi@edge-pi.local "mkdir -p ~/capstone"
scp -r capstone/edge pi@edge-pi.local:~/capstone/
```
On the Pi:
```bash
bash ~/capstone/edge/bootstrap_pi.sh   # apt installs python3-aiohttp + chrony, puts the journal in RAM, installs the service
vcgencmd get_throttled                  # 0x0 means power is fine; anything else = weak supply or cable
```

## 3. Deploy the AWS primary (about 10 minutes)

```bash
cd capstone/cloud/aws
API_TOKEN=$API_TOKEN NOTIFY_EMAIL=you@example.com ./deploy.sh      # NOTIFY_EMAIL is optional
```
It prints `ApiUrl`. Confirm the SNS subscription email if you gave one. Smoke test:
```bash
API=https://xxxx.execute-api.ap-south-1.amazonaws.com
curl $API/health
curl -X POST $API/requests -H "Authorization: Bearer $API_TOKEN" -H "X-User: chad" -H "Content-Type: application/json" \
     -d '{"type":"LEAVE","title":"Annual leave 2 days"}'
```

**Dashboard:** open `dashboard/index.html` in a browser, paste the API URL and token, click Connect. Submit as Employee, switch the role to Manager and approve, then HR, then "Track a request" to see history and the audit ledger written by the stream function (sha256 per entry). For an Expense claim, upload a receipt before Finance approves; the file goes straight to S3, never through Lambda.

## 4. Start the edge prober (about 15 minutes)

On the Pi:
```bash
nano ~/capstone/edge/prober.env      # PRIMARY_URL, API_TOKEN; leave SECONDARY_URL empty for now
python3 ~/capstone/edge/prober.py --smoke              # walks every workflow type end to end; prints SMOKE PASS
sudo systemctl enable --now edge-prober                # runs forever at RATE_PER_MIN, restarts on boot
journalctl -u edge-prober -f                           # one summary line per minute: p50/p95/p99, errors, CPU temp
```
Within a minute the dashboard's **Edge telemetry** panel fills in.

Raw data on the Pi: `~/edge-logs/samples-YYYYMMDD.csv` (every call), `events.jsonl` (failovers), `summaries.jsonl` (per minute).

## 5. Deploy the GCP secondary (about 15 minutes)

```bash
cd capstone/cloud/gcp
API_TOKEN=$API_TOKEN GCP_PROJECT=your-project-id ./deploy.sh     # enables APIs, creates Firestore, deploys
```
It prints the function URL. Put it in `SECONDARY_URL` on the Pi, then:
```bash
python3 ~/capstone/edge/prober.py --smoke && sudo systemctl restart edge-prober
```

**Plan B if GCP billing is not possible today:** deploy the AWS stack a second time in another region and use that as the secondary. It still demonstrates the failover mechanism; say so honestly in the review:
```bash
AWS_REGION=ap-southeast-1 STACK_NAME=capstone-workflow-dr API_TOKEN=$API_TOKEN ./deploy.sh
```

## 6. Benchmarks and the chaos drill (about 45 minutes)

Stop the service while benchmarking so runs don't overlap: `sudo systemctl stop edge-prober`.

```bash
# on the Pi: three 5-minute load levels (spec target: p95 < 2 s at up to 500 req/min)
python3 ~/capstone/edge/prober.py --rate 60  --duration 300
python3 ~/capstone/edge/prober.py --rate 300 --duration 300
python3 ~/capstone/edge/prober.py --rate 500 --duration 300
```

`--rate` counts workflow operations. Receipt uploads add calls and health checks run every 2 s, so measured calls/min comes out roughly 10 to 20 % higher; quote the calls/min from `report.md`.

**Chaos drill** (failover < 15 s target). Start a run on the Pi, then on the laptop take AWS down and bring it back:
```bash
python3 ~/capstone/edge/prober.py --rate 120 --duration 360      # Pi
./capstone/cloud/aws/chaos.sh down     # laptop, about 1 minute into the run: Lambda concurrency = 0, every call 5xx
./capstone/cloud/aws/chaos.sh up       # 2 minutes later: restore; the Pi fails back after 5 healthy checks
```
The Pi prints `FAILOVER_START`, `FAILOVER_COMPLETE {"failover_ms": ...}` and `FAILBACK`.

Report (on the Pi, or copy `~/edge-logs` to the laptop):
```bash
python3 ~/capstone/edge/report.py ~/edge-logs --out ~/results
python3 ~/capstone/edge/report.py ~/edge-logs --since 2026-10-29T14:00 --out ~/results-steady   # one window only
scp -r pi@edge-pi.local:~/results .
```
`report.md` checks the SMART targets (p95 < 2000 ms, 99.9 % success, failover < 15 s) and breaks latency down by cloud and operation. `latency.svg` is the p95-per-minute chart with failover markers, ready for a slide.

Then `sudo systemctl start edge-prober` again for the live demo.

## 7. Before you leave it running / cost control

- At 60 ops/min this stays within free tiers or costs a few cents a day. Stop the load when you don't need it: `sudo systemctl stop edge-prober`.
- Tear down after grading: `aws cloudformation delete-stack --stack-name capstone-workflow --region ap-south-1` and `gcloud functions delete workflow-api --gen2 --region asia-south1`. Empty the document S3 bucket first if the delete fails.

## Run everything on a laptop first (optional, 5 minutes)

No cloud needed, useful if AWS signup is slow:
```bash
export API_TOKEN=test-token-1234567890
python3 cloud/local/local_server.py --port 8081 --name aws-sim --fail-after 60 &   # "fails" after 60 s
python3 cloud/local/local_server.py --port 8082 --name gcp-sim &
# prober.env: PRIMARY_URL=http://<laptop-ip>:8081  SECONDARY_URL=http://<laptop-ip>:8082
python3 edge/prober.py --rate 300 --duration 120        # watch it fail over at ~60 s
python3 tests/test_workflow.py                          # 7 tests; the AWS one needs: pip install boto3 "moto[dynamodb,s3,events]"
```

---

## How the build maps to your architecture documents

| Spec (Methodology doc) | Implemented as |
|---|---|
| Stage 1, ingestion and edge validation | Dashboard + Pi prober; payload validation in `workflow_core.new_request` |
| Stage 2, API Gateway threat shield | HTTP API with throttling (50 req/s, burst 100) and CORS; bearer token check |
| Stage 3, stateless FaaS routing and permission checks | `api.py` Lambda / `main.py` Cloud Function, role check per approval stage |
| Stage 4, EventBridge dispatch | Stream Lambda publishes `RequestSubmitted / Advanced / Completed / Rejected` to a custom bus, 30-day archive |
| Stage 5, DynamoDB / Firestore + S3 AES-256 | Single-table DynamoDB with GSI approval queues, optimistic locking (`version`), PITR; S3 SSE-AES256, versioned, presigned PUT |
| Stage 6, notifications and audit | EventBridge rule to SNS email; DynamoDB Streams to write-once audit entries with sha256, DLQ on failure |
| 4 workflows (section 1.2) | `WORKFLOWS` in `workflow_core.py`; Expense requires a receipt before Finance audit |
| Active-passive AWS + GCP | Same engine on both; client-side failover in the Pi (3 consecutive failures or failed health check), automatic failback |
| Pi edge testbed, aiohttp, p95 telemetry | `edge/prober.py` (asyncio + aiohttp), CSV per call, per-minute summaries shipped to the cloud, `report.py` |

## Honest deviations to state in the review

- **Hardware:** Raspberry Pi **3 Model B+** (1 GB, Cortex-A53) and a **16 GB Class 6** card instead of the Pi 4 / 64 GB / SSD in the BOM. The prober is light (about 40 MB RAM at 500 req/min), uses Raspberry Pi OS Lite, keeps the journal in RAM and prunes logs after 7 days to spare the card. Update the hardware slide.
- **Auth:** shared bearer token plus `X-User` / `X-Role` headers stand in for Cognito JWT. Next step: Cognito user pool + HTTP API JWT authorizer, role from a token claim.
- **Failover routing:** done by the edge client, not Route 53. Route 53 DNS failover needs a registered domain and custom domains on both clouds; the prober's short DNS cache means it already works with a Route 53 health-checked record if you add one later.
- **Replication:** AWS and GCP keep separate data; the spec's Streams-to-Firestore replication is future work. Uploads are AWS-only, so during failover the API returns 503 for upload URLs.
- **Frontend:** a single-file HTML console instead of the React 18 SPA; it exercises the same API.
- **IaC:** AWS SAM (CloudFormation) instead of Terraform; GCP via a gcloud script.
- **Testing status:** the shared engine, the AWS Lambda functions (on moto) and the Pi prober (including a simulated outage and failover) are tested locally. The GCP Firestore adapter was not run against a real project before handover, so watch its first smoke test.
