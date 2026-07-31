# Dependency advisory status

Last reviewed: 2026-07-30

## Production boundary

WinterWatch-Pro is built as a client-rendered Vite application and served from a
minimal Nginx container. Node.js, npm, Vite, ESLint, Capacitor CLI, and the PWA
build toolchain are not present in the production image.

## Remediation completed

- Updated supported dependencies within their declared version ranges.
- Updated jsPDF and its checked-in browser vendor files.
- Updated Capacitor build tooling.
- Updated Vite, Vitest, PostCSS, Supabase JS, and related transitive packages.
- Updated ESLint while preserving the project's established hooks rules.
- Moved build-only packages from runtime dependencies to development
  dependencies.
- Overrode the vulnerable EJS build dependency with a patched release.
- Updated React Router from version 6 to version 7 and pinned the reviewed
  release.

## Remaining npm audit finding

`npm audit` reports one React Router advisory as two package findings
(`react-router` and `react-router-dom`). The advisory applies to React Server
Components action handling. WinterWatch-Pro does not use React Server
Components, framework/data-router actions, or a React server runtime; it uses
`BrowserRouter` in a static client bundle served by Nginx.

The finding is therefore not reachable in this deployment. It remains tracked
until React Router publishes a release that resolves the advisory without
reintroducing the broader client-routing advisories present in older releases.

Do not run `npm audit fix --force` without reviewing the proposed React Router
change and completing the full application test suite.
