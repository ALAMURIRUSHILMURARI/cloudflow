#!/usr/bin/env bash
# Publish the prebuilt React app (dist/) to S3 + CloudFront and point it at the API stacks.
# Usage: PRIMARY_URL=... [SECONDARY_URL=...] [AWS_REGION=ap-southeast-2] bash deploy_web.sh
# If CloudFront is not allowed in your AWS account, the app still works: open dist/index.html in Chrome.
set -uo pipefail
cd "$(dirname "$0")"
: "${PRIMARY_URL:?set PRIMARY_URL}"
REGION="${AWS_REGION:-ap-southeast-2}"
STACK="${WEB_STACK:-capstone-web}"
printf 'window.APP_CONFIG = { primaryUrl: "%s", secondaryUrl: "%s" };\n' "$PRIMARY_URL" "${SECONDARY_URL:-}" > dist/config.js

if ! aws cloudformation deploy --template-file template.yaml --stack-name "$STACK" --region "$REGION" --no-fail-on-empty-changeset; then
  echo "CloudFront hosting could not be created (often an organization policy). Open webapp/dist/index.html in Chrome instead."
  exit 0
fi
out() { aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text; }
aws s3 sync dist "s3://$(out BucketName)" --delete --region "$REGION" --only-show-errors
aws cloudfront create-invalidation --distribution-id "$(out DistributionId)" --paths "/*" >/dev/null 2>&1 || true
echo "Web app: $(out WebUrl)   (a brand-new CloudFront URL can take 5-10 minutes to start answering)"
