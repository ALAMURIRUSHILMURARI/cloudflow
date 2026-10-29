#!/usr/bin/env bash
# Everything in one go: DR stack, primary stack (copying its data to DR), demo users on both.
# The CloudFlow site on GitHub Pages is the web front end; DEPLOY_WEB=1 also deploys the simple CloudFront console.
# Usage: DEMO_PASSWORD=... [NOTIFY_EMAIL=you@x.com] [DEPLOY_WEB=1] bash deploy_all.sh
set -euo pipefail
cd "$(dirname "$0")"
: "${DEMO_PASSWORD:?set DEMO_PASSWORD (8+ characters with at least one number)}"
export AWS_REGION="${AWS_REGION:-ap-southeast-2}"
PRIMARY="${PRIMARY_STACK:-capstone-v2}"
DR="${DR_STACK:-capstone-v2-dr}"
out() { aws cloudformation describe-stacks --stack-name "$1" --query "Stacks[0].Outputs[?OutputKey=='$2'].OutputValue" --output text; }

echo "== 1/3 DR stack ($DR)"
STACK_NAME="$DR" NOTIFY_EMAIL= REPLICA_TABLE= ESCALATE_AFTER_MIN=0 bash deploy.sh
echo "== 2/3 primary stack ($PRIMARY), replicating to the DR table"
STACK_NAME="$PRIMARY" REPLICA_TABLE="$(out "$DR" TableName)" bash deploy.sh
echo "== 3/3 demo users"
STACK_NAME="$DR" bash create_users.sh
STACK_NAME="$PRIMARY" bash create_users.sh
if [ "${DEPLOY_WEB:-0}" = 1 ]; then
  echo "== extra: CloudFront web console"
  PRIMARY_URL="$(out "$PRIMARY" ApiUrl)" SECONDARY_URL="$(out "$DR" ApiUrl)" bash ../../webapp/deploy_web.sh
fi

cat <<DONE

All deployed.
  PRIMARY_URL=$(out "$PRIMARY" ApiUrl)
  SECONDARY_URL=$(out "$DR" ApiUrl)
  Users: employee@cloudflow.demo manager@cloudflow.demo admin@cloudflow.demo (+ procurement@ finance@ hr@ it@),
         employee1 manager1 ... admin1, pi-edge-01  (password = DEMO_PASSWORD)

CloudFlow site: put these lines in the repo's .env and push to main (GitHub Pages rebuilds):
VITE_MOCK_MODE=false
VITE_API_BASE_URL=$(out "$PRIMARY" ApiUrl)
VITE_API_SECONDARY_URL=$(out "$DR" ApiUrl)
${NOTIFY_EMAIL:+  Check $NOTIFY_EMAIL for the AWS confirmation email and click Confirm subscription.}
DONE
