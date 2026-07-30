# WinterWatch-Pro GHOS deployment

This package moves only the WinterWatch-Pro web application to the GHOS Ubuntu
VM. Its existing managed Supabase project remains the production source of
truth for Database, Auth, Storage, Realtime, Edge Functions, and scheduled
jobs.

## Security boundary

The browser receives only public configuration:

- managed Supabase project URL;
- Supabase publishable key;
- public WinterWatch URL; and
- optional browser-facing Dispatch route values.

Never add a Supabase service-role key, database password, Backblaze key, or
other server credential to `.env.ghos`. The container refuses common privileged
database key names, and the image is built without any `.env` file in its
Docker context.

The startup guard requires the managed WinterWatch project:

```text
caegybyfdkmgjrygnavg
```

It refuses to start if the project ID and URL do not match.

## Prepare on GHOS

Install the source at `/opt/ghos/apps/winterwatch-pro`, then create its private
runtime file:

```bash
cd /opt/ghos/apps/winterwatch-pro
cp .env.ghos.example .env.ghos
chmod 600 .env.ghos
nano .env.ghos
```

Enter the existing publishable key and browser Dispatch token. Do not enter a
service-role key.

The existing `ghos-internal` Docker network must exist:

```bash
docker network inspect ghos-internal >/dev/null
```

## Build and verify

```bash
cd /opt/ghos/apps/winterwatch-pro
./scripts/verify-ghos-package.sh
```

The verifier:

1. validates the environment boundary;
2. renders the Compose model;
3. builds the secret-free static image;
4. starts only `winterwatch-pro-web`;
5. waits for its internal health endpoint; and
6. confirms the runtime browser configuration still points to managed
   WinterWatch Supabase.

The default local endpoint is:

```text
http://GHOS-IP:8083
```

Keep this port private to the LAN/Tailscale or place it behind the approved
reverse proxy before changing public DNS.

## Routine deployment

```bash
cd /opt/ghos/apps/winterwatch-pro
git pull --ff-only
docker compose --env-file .env.ghos -f compose.ghos.yml up -d --build web
docker compose --env-file .env.ghos -f compose.ghos.yml ps
```

The service uses `restart: unless-stopped`, so Docker brings it back after the
GHOS VM restarts. No WinterWatch database container is part of this package.

## Rollback

Record the known-good Git commit before each deployment. To roll back the web
application:

```bash
cd /opt/ghos/apps/winterwatch-pro
git switch --detach KNOWN_GOOD_COMMIT
docker compose --env-file .env.ghos -f compose.ghos.yml up -d --build web
```

This rollback does not alter managed Supabase.
