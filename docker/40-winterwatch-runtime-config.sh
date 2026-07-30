#!/bin/sh
set -eu

expected_project_id="${WINTERWATCH_EXPECTED_SUPABASE_PROJECT_ID:-caegybyfdkmgjrygnavg}"

required_names="
VITE_SUPABASE_PROJECT_ID
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_PUBLIC_WEB_URL
"

for name in $required_names; do
  eval "value=\${$name:-}"
  if [ -z "$value" ]; then
    printf 'WinterWatch runtime configuration is missing %s.\n' "$name" >&2
    exit 1
  fi
done

if [ "$VITE_SUPABASE_PROJECT_ID" != "$expected_project_id" ]; then
  printf 'Refusing unexpected WinterWatch Supabase project ID: %s\n' \
    "$VITE_SUPABASE_PROJECT_ID" >&2
  exit 1
fi

expected_supabase_url="https://${expected_project_id}.supabase.co"
if [ "$VITE_SUPABASE_URL" != "$expected_supabase_url" ]; then
  printf 'Refusing unexpected WinterWatch Supabase URL: %s\n' \
    "$VITE_SUPABASE_URL" >&2
  exit 1
fi

validate_url() {
  name="$1"
  eval "value=\${$name:-}"
  if [ -n "$value" ] &&
    ! printf '%s' "$value" |
      grep -Eq '^https://[A-Za-z0-9._~:/?#@!$&()*+,;=%-]+$'; then
    printf 'WinterWatch runtime URL %s contains unsupported characters.\n' \
      "$name" >&2
    exit 1
  fi
}

validate_token() {
  name="$1"
  eval "value=\${$name:-}"
  if [ -n "$value" ] &&
    ! printf '%s' "$value" | grep -Eq '^[A-Za-z0-9._~-]+$'; then
    printf 'WinterWatch runtime token %s contains unsupported characters.\n' \
      "$name" >&2
    exit 1
  fi
}

validate_url VITE_SUPABASE_URL
validate_url VITE_PUBLIC_WEB_URL
validate_url VITE_DISPATCH_DRIVER_ROUTE_URL
validate_url VITE_DISPATCH_DRIVER_LOCATION_ENDPOINT
validate_token VITE_SUPABASE_PUBLISHABLE_KEY
validate_token VITE_DISPATCH_DRIVER_TRACKING_TOKEN

envsubst \
  '${VITE_SUPABASE_PROJECT_ID} ${VITE_SUPABASE_URL} ${VITE_SUPABASE_PUBLISHABLE_KEY} ${VITE_PUBLIC_WEB_URL} ${VITE_DISPATCH_DRIVER_ROUTE_URL} ${VITE_DISPATCH_DRIVER_LOCATION_ENDPOINT} ${VITE_DISPATCH_DRIVER_TRACKING_TOKEN}' \
  < /opt/winterwatch/runtime-config.template.js \
  > /tmp/runtime-config.js

chmod 0444 /tmp/runtime-config.js
