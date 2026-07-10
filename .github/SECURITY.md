# Security Policy

## Reporting a Vulnerability

This is a personal portfolio site with no backend, no user accounts, and no
stored user data. If you find a security issue anyway (e.g. a header
misconfiguration, an XSS vector, a dependency vulnerability), please report
it by emailing **suryapugaz1629@gmail.com**.

Include:

- A description of the issue and its potential impact
- Steps to reproduce
- Any relevant URLs, payloads, or screenshots

Please do not open a public GitHub issue for suspected vulnerabilities until
it has been triaged.

## Security Baseline

The site ships the following response headers on every route (`vercel.json`):

- `X-Content-Type-Options: nosniff` — blocks MIME-sniffing.
- `Referrer-Policy: strict-origin-when-cross-origin` — limits referrer leakage
  to cross-origin requests.
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` — disables
  browser features the site never uses.
- `X-Frame-Options: DENY` — prevents the site from being framed (clickjacking
  protection).
- `Content-Security-Policy-Report-Only` — a draft CSP shipped in
  **report-only** mode (see below).

TLS/HSTS is managed by Vercel and not configured at the application level.

## CSP: Report-Only Today, Enforced Later

The current policy:

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
connect-src 'self' blob:;
worker-src 'self' blob:;
font-src 'self';
```

It is deployed as `Content-Security-Policy-Report-Only` rather than a
blocking `Content-Security-Policy`. Rationale:

- The site uses **React Three Fiber / drei / three.js**, which rely on inline
  `<style>` injection and, in some code paths, `blob:` Web Workers for
  decoders (Draco/meshopt) — `worker-src 'self' blob:` and `connect-src blob:`
  accommodate this.
- Next.js dev mode and React's inline hydration warnings can require
  `'unsafe-eval'` in `script-src` during local development; production builds
  do not need it for this app today, so it is intentionally omitted here.
  If a future dependency requires `eval`-based code generation in production,
  that must be re-evaluated (nonces/hashes preferred over blanket
  `'unsafe-eval'`).
- `'unsafe-inline'` on `script-src`/`style-src` is a known weakening; the
  intended follow-up is to move to nonce- or hash-based CSP once inline style
  usage from R3F/drei has been audited and Next.js's inline bootstrap script
  is nonced.

**Path to enforcement:** once report-only telemetry (via browser console /
a future `report-to` endpoint) shows no unexpected violations across all
pavilions, replace `Content-Security-Policy-Report-Only` with a blocking
`Content-Security-Policy` header in `vercel.json`. Until then, the
report-only header is a non-blocking baseline that surfaces violations
without risking a broken production site.

## Dependencies

Dependency updates are managed by Dependabot (`.github/dependabot.yml`),
grouped weekly for `npm` and `github-actions` ecosystems. CI
(`.github/workflows/ci.yml`) runs lint, unit tests, and a production build on
every pull request and push to `main`.
