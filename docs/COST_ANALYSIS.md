# Cost analysis: serverless vs always-on servers

SMART target: **60–70 % lower cloud cost** than a conventional VM deployment, and **$0 when idle**.

All prices are approximate on-demand list prices in USD for ap-southeast-2 (Sydney), as of 2026. Check them in the AWS Pricing Calculator before quoting exact figures. The free tier is ignored, so these are real-world numbers.

## What one API call costs on our stack

| Component | Price used | Per call |
|---|---|---|
| API Gateway HTTP API | $1.29 per million requests | $0.00000129 |
| Lambda requests | $0.20 per million | $0.00000020 |
| Lambda compute (arm64, 256 MB, 100 ms average, conservative) | $0.0000133 per GB-second | $0.00000033 |
| DynamoDB on-demand (about 1.5 writes + 1 read per call, counting audit and stream) | ~$0.70 per million writes, ~$0.14 per million reads | $0.00000119 |
| Stream function, EventBridge and SNS (about 0.5 events per call) | ~$1 per million events | $0.00000050 |
| **Total** | | **≈ $0.0000035 per call (≈ $3.50 per million)** |

Storage (DynamoDB at $0.25–0.30 per GB-month, S3 at about $0.025 per GB-month) is a few cents at capstone scale.

## Baseline: the same system on always-on servers (high availability, two AZs)

| Component | Monthly |
|---|---|
| 2 × EC2 t3.medium app servers, 24/7 | ~$77 |
| Application Load Balancer | ~$25 |
| RDS PostgreSQL db.t3.small Multi-AZ, 20 GB | ~$65 |
| NAT gateway, for private subnets | ~$45 |
| EBS volumes, backups and CloudWatch | ~$15 |
| **Total** | **≈ $227 per month, whether anyone uses it or not** |

A warm DR copy in a second cloud roughly doubles this, to about $450 per month. In our design the DR stack costs nothing until traffic hits it.

## Comparison

| Scenario | Calls per month | Serverless | VM baseline | Saving |
|---|---|---|---|---|
| Idle (nights, weekends, holidays) | 0 | **$0** | $227 | 100 % |
| Typical company (2,000 requests a day, about 10 API calls each) | 0.6 M | ~$2 | $227 | ~99 % |
| Busy company (20,000 requests a day) | 6 M | ~$21 | $227 | ~91 % |
| **SMART peak: 500 req/min, 24 hours a day, every day** | **21.6 M** | **~$76** | **$227** | **~67 %** |
| Same peak load, primary + DR included | 21.6 M | ~$77 (the DR stack is idle) | ~$450 | ~83 % |

**Conclusion:** even under the worst case of the SMART load running non-stop, serverless is about 67 % cheaper, which hits the 60–70 % target. At realistic enterprise volumes the saving is over 90 %, and idle time costs nothing. The break-even point, where the VMs become cheaper, is about 65 million calls a month, which works out to roughly 1,500 calls a minute around the clock.

## Measured facts to quote

- Every call in our tests came from the Raspberry Pi. At our test volumes the bill should be at or near $0, mostly covered by the free tier. Open **Billing → Bills** in the AWS console and screenshot the real figure for the report.
- To get the real average Lambda duration (to replace the 100 ms assumption), run this in the laptop terminal:

```bash
aws cloudwatch get-metric-statistics --region ap-southeast-2 --namespace AWS/Lambda --metric-name Duration \
  --dimensions Name=FunctionName,Value=$(aws cloudformation describe-stacks --stack-name capstone-v2 --region ap-southeast-2 \
  --query "Stacks[0].Outputs[?OutputKey=='ApiFunctionName'].OutputValue" --output text) \
  --start-time $(date -u -d '-1 day' +%FT%TZ) --end-time $(date -u +%FT%TZ) --period 86400 --statistics Average Maximum
```

If the average comes back under 100 ms (it usually does, because warm calls take 20–60 ms), the serverless figures above are slightly overstated, which makes the claimed saving conservative.
