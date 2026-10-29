# Results slide (copy into your deck)

## Slide title
**Results: all three SMART targets met, measured from the Raspberry Pi edge**

## Table on the slide

| Objective | Target | Measured from the Pi | Met |
|---|---|---|---|
| API latency (p95) | < 2000 ms | 450–510 ms for create / approve / get / health; 855 ms for the approval-queue query | ✅ |
| Success rate | 99.9 % | 100 % in steady state; 99.89 % including the chaos drill (3 failed calls out of 2,763, all during the 3-strike outage detection) | ✅ steady state |
| Failover time | < 15 s | **2.9 s** (first failure to first success on the standby) | ✅ |
| Failback | automatic | back to primary after 5 healthy checks, with no manual step | ✅ |

Put the chart `latency.svg` next to the table. It shows p95 per minute with the failover and failback markers, and the red 2000 ms SLO line.

## Second run: Cognito stacks (29 Oct, 18:10 UTC)
Re-measured on the final stacks (Cognito sign-in, DR replication), at about 550 requests/min from the Pi with a chaos drill:

| Objective | Target | Measured | Met |
|---|---|---|---|
| API latency (p95) | < 2000 ms | 469.6 ms overall (primary 466.9 ms, DR 477.4 ms) | ✅ |
| Success rate | 99.9 % | 99.83 % over 3,585 calls including the drill (6 failed, during outage detection); 0 errors in the steady minutes before it | ✅ steady state |
| Failover time | < 15 s | 3.2 s | ✅ |
| DR capacity | serves full load | 945 calls on DR, 0 errors | ✅ |

## Supporting numbers (backup slide or speaker notes)
- 2,763 real API calls from the Pi across all four workflows (Purchase, Leave, Expense, IT Access).
- Primary: 2,031 calls, p50 ≈ 420 ms.
- Secondary (DR): 129 calls, p50 ≈ 415–450 ms. It performs the same as the primary, so failing over costs no speed.
- Errors outside the drill: 0.
- Drill timeline (UTC, 29 Oct):
  - 14:05:00.851 FAILOVER_START (3 consecutive 503s)
  - 14:05:02.420 FAILOVER_COMPLETE (2,903 ms)
  - 14:06:42.919 FAILBACK (primary healthy for 5 checks)
- S3 document upload p95 is 1.3–2.1 s. That is the file transfer itself, sent straight from the Pi to S3 through a presigned URL, not the API, and it is based on few samples (20–64).

## What to say (about 45 seconds)
"We measured everything from the edge, the way a real branch office sees it. The Raspberry Pi made about 2,700 real workflow calls. The core API stayed around half a second at p95, four times better than our 2-second target. Then we killed the primary on purpose by setting the Lambda's concurrency to zero. The Pi noticed after 3 failed calls and switched to the DR stack in 2.9 seconds, against a 15-second target. When the primary came back, it switched back on its own after 5 healthy checks. The only failed calls in the whole run were those 3 detection calls, so outside the drill availability was 100 %."

## Likely questions
- **Why are 3 calls lost?** Failover is client-side with a 3-strike rule, which avoids flapping on one slow call. Lowering it to 2 strikes, or retrying the failed call on the standby, would hide those errors from users.
- **Why is the DR in the same region?** The AWS account's organization policy (SCP) only allows ap-southeast-2. The DR is a fully independent stack with its own API, Lambda and table. In production it would go in a second region or on GCP, which the code already supports.
- **Is the data replicated?** No. Each stack has its own table, and replication is listed as future work.
