#!/usr/bin/env sh
set -eu

repo_root="$(
  cd "$(dirname "$0")/.."
  pwd
)"
env_file="${WINTERWATCH_ENV_FILE:-$repo_root/.env.ghos}"
compose_file="$repo_root/compose.ghos.yml"
expected_project_id="caegybyfdkmgjrygnavg"

if [ ! -f "$env_file" ]; then
  printf 'WinterWatch GHOS environment file not found: %s\n' "$env_file" >&2
  printf 'Copy .env.ghos.example to .env.ghos and add the existing public values.\n' >&2
  exit 1
fi

if grep -Eiq '(^|_)(SERVICE_ROLE(_KEY)?|DATABASE_PASSWORD|DB_PASSWORD)=' "$env_file"; then
  printf 'Refusing privileged Supabase credentials in %s.\n' "$env_file" >&2
  exit 1
fi

if grep -Eq 'REPLACE_WITH|supabase\.example' "$env_file"; then
  printf 'Replace every placeholder in %s before deployment.\n' "$env_file" >&2
  exit 1
fi

for command_name in docker grep mktemp; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf 'Required command not found: %s\n' "$command_name" >&2
    exit 1
  fi
done

runtime_copy="$(mktemp "${TMPDIR:-/tmp}/winterwatch-runtime.XXXXXX")"
cleanup() {
  rm -f "$runtime_copy"
}
trap cleanup EXIT INT TERM

cd "$repo_root"
export WINTERWATCH_ENV_FILE="$env_file"

docker compose --env-file "$env_file" -f "$compose_file" config >/dev/null
docker compose --env-file "$env_file" -f "$compose_file" build web
docker compose --env-file "$env_file" -f "$compose_file" up -d web

attempt=0
until docker compose --env-file "$env_file" -f "$compose_file" \
  exec -T web wget -qO- http://127.0.0.1/healthz >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    docker compose --env-file "$env_file" -f "$compose_file" ps
    docker compose --env-file "$env_file" -f "$compose_file" logs --tail=80 web
    printf 'WinterWatch container did not become healthy.\n' >&2
    exit 1
  fi
  sleep 2
done

docker compose --env-file "$env_file" -f "$compose_file" \
  exec -T web cat /tmp/runtime-config.js > "$runtime_copy"

if ! grep -Fq \
  "VITE_SUPABASE_PROJECT_ID: \"$expected_project_id\"" \
  "$runtime_copy"; then
  printf 'Runtime configuration does not target the WinterWatch project.\n' >&2
  exit 1
fi
if ! grep -Fq \
  "VITE_SUPABASE_URL: \"https://${expected_project_id}.supabase.co\"" \
  "$runtime_copy"; then
  printf 'Runtime configuration does not target managed WinterWatch Supabase.\n' >&2
  exit 1
fi
if grep -Eq 'REPLACE_WITH|\$\{VITE_' "$runtime_copy"; then
  printf 'Runtime configuration still contains a placeholder.\n' >&2
  exit 1
fi

docker compose --env-file "$env_file" -f "$compose_file" ps
printf '%s\n' \
  'WinterWatch GHOS package passed:' \
  '- container health check' \
  '- managed Supabase project guard' \
  '- runtime browser configuration' \
  '- secret-free image build'
