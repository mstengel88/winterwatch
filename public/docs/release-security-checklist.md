# Release Security Checklist

This project is close to release-ready, but there is one Supabase Auth warning that must still be handled in project settings rather than code:

## Remaining manual Supabase step

- Enable leaked password protection in Supabase Auth.
- Supabase documents this under Authentication password security settings.
- As of Thursday, July 30, 2026, this setting is not represented in this repo's checked-in `supabase/config.toml`.
- Official doc: https://supabase.com/docs/guides/auth/password-security

## Edge Function posture

These functions are now expected to require a signed-in user's JWT before execution:

- `send-notification`
- `check-overtime`
- `overtime-action`
- `export-to-drive`
- `notify-maintenance-request`

These remain intentionally open or specially handled:

- `get-weather`
  Public utility endpoint with input validation only.
- `home-assistant`
  Supports either a user JWT or a service-role-style token for trusted integrations.

## Database posture

- Internal `SECURITY DEFINER` helpers have been moved from `public` to `private`.
- This removes them as public PostgREST RPC endpoints while preserving RLS and trigger behavior.
