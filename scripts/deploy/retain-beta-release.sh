#!/usr/bin/env bash
set -euo pipefail

: "${CI_COMMIT_SHA:?CI_COMMIT_SHA must identify the release}"
: "${STATIC_BUCKET:?STATIC_BUCKET must be read from Terraform output}"
release="releases/${CI_COMMIT_SHA}"

aws s3 cp dist/lambda.zip "s3://${STATIC_BUCKET}/${release}/lambda.zip" \
  --cache-control "private,max-age=31536000,immutable"
aws s3 sync dist/ "s3://${STATIC_BUCKET}/${release}/static/" \
  --exclude "lambda.zip" \
  --exclude "lambda/*" \
  --cache-control "private,max-age=31536000,immutable"
