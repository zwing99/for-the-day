#!/usr/bin/env bash
set -euo pipefail

release_sha="${1:?Usage: rollback-beta.sh <previous-commit-sha>}"
: "${AWS_DEFAULT_REGION:=us-east-1}"
: "${STATIC_BUCKET:?STATIC_BUCKET must identify the beta static bucket}"
: "${LAMBDA_FUNCTION_NAME:?LAMBDA_FUNCTION_NAME must identify the beta API function}"
: "${CLOUDFRONT_DISTRIBUTION_ID:?CLOUDFRONT_DISTRIBUTION_ID must identify the beta distribution}"

release_prefix="s3://${STATIC_BUCKET}/releases/${release_sha}"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT
aws s3 cp "${release_prefix}/lambda.zip" "$work_dir/lambda.zip"
aws s3 sync "${release_prefix}/static/" "$work_dir/static/"


version="$(aws lambda update-function-code \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --zip-file "fileb://${work_dir}/lambda.zip" \
  --publish \
  --query 'Version' --output text)"
aws lambda wait function-updated --function-name "$LAMBDA_FUNCTION_NAME"
aws lambda update-alias \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --name beta \
  --function-version "$version"

# Do not delete the live root: old hashed and WEBU URLs may still be in clients.
aws s3 sync "$work_dir/static/" "s3://${STATIC_BUCKET}/" \
  --exclude "index.html" \
  --exclude "sw.js" \
  --exclude "manifest.webmanifest" \
  --exclude "assets/*" \
  --exclude "scripture/webu/*" \
  --cache-control "public,max-age=300,must-revalidate"
aws s3 sync "$work_dir/static/assets/" "s3://${STATIC_BUCKET}/assets/" \
  --cache-control "public,max-age=31536000,immutable"
aws s3 sync "$work_dir/static/scripture/webu/" "s3://${STATIC_BUCKET}/scripture/webu/" \
  --cache-control "public,max-age=31536000,immutable"
aws s3 cp "$work_dir/static/index.html" "s3://${STATIC_BUCKET}/index.html" \
  --content-type "text/html; charset=utf-8" \
  --cache-control "no-cache,max-age=0,must-revalidate"
aws s3 cp "$work_dir/static/sw.js" "s3://${STATIC_BUCKET}/sw.js" \
  --content-type "application/javascript" \
  --cache-control "no-cache,max-age=0,must-revalidate"
aws s3 cp "$work_dir/static/manifest.webmanifest" "s3://${STATIC_BUCKET}/manifest.webmanifest" \
  --content-type "application/manifest+json" \
  --cache-control "no-cache,max-age=0,must-revalidate"
aws cloudfront create-invalidation \
  --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
  --paths /index.html /sw.js /manifest.webmanifest
