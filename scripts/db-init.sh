#!/bin/sh
set -eu

# The endpoint is fixed to the Compose service, never an AWS endpoint.
ddb() {
  aws dynamodb --endpoint-url http://dynamodb:8000 \
    --cli-connect-timeout 1 --cli-read-timeout 2 "$@"
}

attempt=0
until ddb list-tables >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo "DynamoDB Local did not become ready. Check docker compose logs dynamodb." >&2
    exit 1
  fi
  sleep 1
done

if ! ddb describe-table --table-name "$DYNAMODB_TABLE" >/dev/null 2>/tmp/table-error; then
  if ! grep -q ResourceNotFoundException /tmp/table-error; then
    echo "Unable to inspect the local table. Check DYNAMODB_TABLE configuration." >&2
    exit 1
  fi
  if ! ddb create-table --table-name "$DYNAMODB_TABLE" \
    --billing-mode PAY_PER_REQUEST \
    --key-schema AttributeName=pk,KeyType=HASH \
    --attribute-definitions AttributeName=pk,AttributeType=S >/dev/null 2>/tmp/create-error; then
    # Concurrent initializers may race; an existing table is safe to wait for.
    if ! grep -q ResourceInUseException /tmp/create-error; then
      echo "Unable to create the local table. Check DYNAMODB_TABLE configuration." >&2
      exit 1
    fi
  fi
fi

attempt=0
until [ "$(ddb describe-table --table-name "$DYNAMODB_TABLE" --query Table.TableStatus --output text)" = ACTIVE ]; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo "DynamoDB Local table did not become active." >&2
    exit 1
  fi
  sleep 1
done
# Enable built-in row TTL; keep manifest rows without an expiry attribute.
ttl_status=$(ddb describe-time-to-live --table-name "$DYNAMODB_TABLE" --query TimeToLiveDescription.TimeToLiveStatus --output text)
case "$ttl_status" in
  ENABLED|ENABLING)
    ttl_attribute=$(ddb describe-time-to-live --table-name "$DYNAMODB_TABLE" --query TimeToLiveDescription.AttributeName --output text)
    if [ "$ttl_attribute" != expiresEpochSeconds ]; then
      echo "Local table TTL uses another attribute; expected expiresEpochSeconds." >&2
      exit 1
    fi
    ;;
  DISABLED)
    ddb update-time-to-live --table-name "$DYNAMODB_TABLE" \
      --time-to-live-specification 'Enabled=true,AttributeName=expiresEpochSeconds' >/dev/null
    ;;
  *) echo "Local table TTL is transitioning; retry db:init shortly." >&2; exit 1 ;;
esac
echo "DynamoDB Local table is ready with row TTL configured."
