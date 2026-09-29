#!/usr/bin/env bash
set -euo pipefail

: "${STATIC_BUCKET:?STATIC_BUCKET must be read from Terraform output}"
: "${CLOUDFRONT_DISTRIBUTION_ID:?CLOUDFRONT_DISTRIBUTION_ID must be read from Terraform output}"

# Upload ordinary public static files but leave the current shell active.
aws s3 sync dist/ "s3://${STATIC_BUCKET}/" \
  --exclude "index.html" \
  --exclude "sw.js" \
  --exclude "manifest.webmanifest" \
  --exclude "lambda/*" \
  --exclude "lambda.zip" \
  --exclude "assets/*" \
  --exclude "scripture/webu/*" \
  --cache-control "public,max-age=300,must-revalidate"

# Content hashes and the WEBU revision make these URLs immutable across releases.
aws s3 sync dist/assets/ "s3://${STATIC_BUCKET}/assets/" \
  --cache-control "public,max-age=31536000,immutable"
aws s3 sync dist/scripture/webu/ "s3://${STATIC_BUCKET}/scripture/webu/" \
  --cache-control "public,max-age=31536000,immutable"

# Switch entry documents only after all referenced files are available.
aws s3 cp dist/index.html "s3://${STATIC_BUCKET}/index.html" \
  --content-type "text/html; charset=utf-8" \
  --cache-control "no-cache,max-age=0,must-revalidate"
aws s3 cp dist/sw.js "s3://${STATIC_BUCKET}/sw.js" \
  --content-type "application/javascript" \
  --cache-control "no-cache,max-age=0,must-revalidate"
aws s3 cp dist/manifest.webmanifest "s3://${STATIC_BUCKET}/manifest.webmanifest" \
  --content-type "application/manifest+json" \
  --cache-control "no-cache,max-age=0,must-revalidate"

aws cloudfront create-invalidation \
  --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
  --paths /index.html /sw.js /manifest.webmanifest
