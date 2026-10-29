# Demo day runbook

## Before you leave home
- Laptop charged; Pi, card (plus a spare card if you bought one), 2.5A charger, phone.
- Open `C:\Users\lenovo\capstone\results\latency.svg` and `report.md` once to make sure they open (these are your backup if anything live fails).

## Setup at the venue (5 min, before your slot)
1. Phone hotspot ON (2.4 GHz, WPA2). Connect the laptop to the same hotspot.
2. Plug the Pi into a wall socket. Wait 2-3 min until `edge-pi` appears under Connected devices. Note its IP (it was 10.203.237.138).
3. In the UCRT64 window:
   ```bash
   echo start
   PI=10.203.237.138
   ssh pi@$PI "systemctl is-active edge-prober; journalctl -u edge-prober -n 3 --no-pager"
   ```
   You want `active` and a line like `aws-primary n=.. err=0 p95=...`.
4. Open `dashboard/index.html` in Chrome. The URL and token are remembered; click Connect.

## Live demo order (about 8 min)
1. **Architecture slide**: Pi edge -> API Gateway -> Lambda -> DynamoDB / S3, Streams -> audit Lambda -> EventBridge -> SNS. Two independent stacks (primary + DR).
2. **Dashboard**: create a PURCHASE request as an employee, approve it as Manager -> Procurement -> Finance from the queue, open Track to show the audit trail (sha256 hash per step). Optionally create an EXPENSE and upload a receipt (S3 presigned URL).
3. **Telemetry**: dashboard telemetry table shows the Pi's live p50/p95 per minute, sent from the edge.
4. **Failover drill** (the highlight):
   ```bash
   echo start
   cd ~/capstone/cloud/aws
   AWS_REGION=ap-southeast-2 bash chaos.sh down
   ssh pi@$PI "journalctl -u edge-prober -f --no-pager"     # watch FAILOVER_START / FAILOVER_COMPLETE, then Ctrl+C
   AWS_REGION=ap-southeast-2 bash chaos.sh up               # ALWAYS run this after
   ```
   The Pi switches to aws-secondary in about 3 s; after `up` it fails back after 5 healthy checks.
5. **Results slide**: p95 vs 2000 ms target, success rate, failover time, latency chart.

## If something breaks
- Pi won't boot / no IP: skip it. Say "here is the recorded run from the Pi" and show `results/report.md` + `latency.svg`. The cloud and dashboard still work from the laptop.
- Dashboard "Failed to fetch": check the laptop is online; re-paste the API URL `https://gh23zcj1xl.execute-api.ap-southeast-2.amazonaws.com`.
- Forgot `chaos.sh up`: primary stays down; run it.

## Shutting down (protects the SD card)
```bash
ssh pi@$PI sudo poweroff
```
Wait until the green light stops, then unplug. Never pull the plug while it is running.

## After grading
Delete both stacks (`capstone-workflow`, `capstone-workflow-dr`) in CloudFormation and delete the IAM access key.
