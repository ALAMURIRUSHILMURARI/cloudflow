#!/usr/bin/env bash
# Deploy one stack. Usage: [STACK_NAME=..] [NOTIFY_EMAIL=you@x.com] [REPLICA_TABLE=<DR table>] [AWS_REGION=..] bash deploy.sh
# Needs only the AWS CLI (no SAM CLI, Python or Docker): the CLI packages and deploys SAM templates itself.
set -euo pipefail
cd "$(dirname "$0")"
REGION="${AWS_REGION:-ap-southeast-2}"
STACK="${STACK_NAME:-capstone-v2}"
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
ARTIFACTS="capstone-artifacts-$ACCOUNT-$REGION"

cp ../core/workflow_core.py src/workflow_core.py      # one shared engine for every cloud
aws s3api head-bucket --bucket "$ARTIFACTS" 2>/dev/null || aws s3 mb "s3://$ARTIFACTS" --region "$REGION"

PARAMS=("EscalateAfterMinutes=${ESCALATE_AFTER_MIN:-120}")
[ -n "${NOTIFY_EMAIL:-}" ] && PARAMS+=("NotifyEmail=$NOTIFY_EMAIL")
[ -n "${REPLICA_TABLE:-}" ] && PARAMS+=("ReplicaTableName=$REPLICA_TABLE")

aws cloudformation package --template-file template.yaml --s3-bucket "$ARTIFACTS" \
  --output-template-file packaged.yaml --region "$REGION" >/dev/null
aws cloudformation deploy --template-file packaged.yaml --stack-name "$STACK" --region "$REGION" \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND --no-fail-on-empty-changeset \
  --parameter-overrides "${PARAMS[@]}"

aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
  --query "Stacks[0].Outputs[].[OutputKey,OutputValue]" --output table
