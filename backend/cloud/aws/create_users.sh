#!/usr/bin/env bash
# Create the demo users (one per role) in a stack's Cognito user pool. Safe to run again.
# Usage: DEMO_PASSWORD=... [STACK_NAME=capstone-v2] [AWS_REGION=ap-southeast-2] bash create_users.sh
set -euo pipefail
: "${DEMO_PASSWORD:?set DEMO_PASSWORD (8+ characters with at least one number)}"
REGION="${AWS_REGION:-ap-southeast-2}"
STACK="${STACK_NAME:-capstone-v2}"
POOL=$(aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text)

# user:group,group   (everyone can always act as Employee)
# The *@cloudflow.demo names are the quick-select profiles on the CloudFlow login page.
USERS="employee1: manager1:Manager procurement1:Procurement finance1:Finance hr1:HR it1:IT admin1:Admin
pi-edge-01:Manager,Procurement,Finance,HR,IT
employee@cloudflow.demo: manager@cloudflow.demo:Manager admin@cloudflow.demo:Admin
procurement@cloudflow.demo:Procurement finance@cloudflow.demo:Finance hr@cloudflow.demo:HR it@cloudflow.demo:IT"
for entry in $USERS; do
  user="${entry%%:*}"; groups="${entry#*:}"
  aws cognito-idp admin-create-user --user-pool-id "$POOL" --region "$REGION" --username "$user" \
    --message-action SUPPRESS >/dev/null 2>&1 || true
  aws cognito-idp admin-set-user-password --user-pool-id "$POOL" --region "$REGION" --username "$user" \
    --password "$DEMO_PASSWORD" --permanent
  for g in ${groups//,/ }; do
    aws cognito-idp admin-add-user-to-group --user-pool-id "$POOL" --region "$REGION" --username "$user" --group-name "$g"
  done
  echo "  $STACK: $user ${groups:-Employee}"
done
