#!/usr/bin/env bash
set -euo pipefail

mkdir -p dist/lambda
bun build src/server/lambda.ts --target=node --format=cjs --packages=bundle --outfile=dist/lambda/index.js
# A fixed timestamp and a single sorted entry make repeated ZIP output stable.
touch -t 202001010000 dist/lambda/index.js
zip -X -j -FS dist/lambda.zip dist/lambda/index.js >/dev/null
