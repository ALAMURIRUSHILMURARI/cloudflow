#!/usr/bin/env bash
# Chaos drill: simulate an AWS outage by throttling the API Lambda to zero, then restore it.
# Usage: ./chaos.sh down | up      (run "down" while the Pi prober is running)
set -euo pipefail
REGION="${AWS_REGION:-ap-southeast-2}"
STACK="${STACK_NAME:-capstone-v2}"
FN=$(aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='ApiFunctionName'].OutputValue" --output text)
case "${1:-}" in
  down) aws lambda put-function-concurrency --function-name "$FN" --region "$REGION" \
          --reserved-concurrent-executions 0 >/dev/null
        echo "$(date -u +%FT%TZ) AWS primary is DOWN (every call now returns 5xx)";;
  up)   aws lambda delete-function-concurrency --function-name "$FN" --region "$REGION"
        echo "$(date -u +%FT%TZ) AWS primary restored";;
  *)    echo "usage: $0 down|up"; exit 1;;
esac
