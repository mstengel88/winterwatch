# WinterWatch-Pro

Winter operations software for field crews and administrators.

## GHOS application-only deployment

WinterWatch-Pro can run as a hardened static container on the GHOS Ubuntu VM
while continuing to use its existing managed Supabase project. The container
accepts public browser configuration at startup, so changing an endpoint does
not require rebuilding it and no Supabase service-role credential is embedded
in the image.

See
[`docs/ghos-managed-supabase-deployment.md`](docs/ghos-managed-supabase-deployment.md)
for preparation, verification, deployment, and rollback instructions.
