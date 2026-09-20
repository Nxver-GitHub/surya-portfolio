import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// Absolute path to this project directory (where next.config.ts lives).
// fileURLToPath is used instead of import.meta.dirname so it resolves on any
// Node version, both locally and on Vercel.
const projectRoot = dirname(fileURLToPath(import.meta.url));

/**
 * The site's Content-Security-Policy. Deliberately `'self'`-only: no external
 * script, style, font or connect origins, which is why Cloudflare Web Analytics
 * was rejected during migration planning (it would force `script-src` open).
 *
 * `'unsafe-inline'` on script-src is required by Next's inline bootstrap, and
 * `'wasm-unsafe-eval'` by the Draco/meshopt decoders in the R3F scenes.
 * `blob:` on worker-src/connect-src covers those same decoders' workers.
 *
 * Keep this byte-for-byte when editing — it is asserted in tests.
 */
const CONTENT_SECURITY_POLICY =
  "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' blob: wss://live.suryapugaz.com; worker-src 'self' blob:; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'";

/**
 * Security headers for every route.
 *
 * These lived in `vercel.json` until the Cloudflare migration. Cloudflare
 * ignores that file entirely, so leaving them there would have shipped the site
 * unprotected the moment traffic moved. In Next's own config they travel with
 * the app and apply identically on Vercel and on Workers — which also means
 * they stay correct during the overlap when both platforms serve traffic.
 */
export const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  // HSTS. Vercel injected this automatically; Cloudflare does not, so the
  // migration silently dropped it and production has been serving without it.
  // Two years, and `includeSubDomains` is safe because every www/long/http
  // variant already 308s to the apex over HTTPS — no subdomain serves plain
  // HTTP.
  //
  // Deliberately NO `preload`: submission to the browser preload list is a
  // one-way door (removal takes months and ships with browser releases) and the
  // owner has not opted into it. Do not add it without that decision.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
];

/**
 * The commit sha for this build, from whichever CI source set it. Checked in
 * this order: an explicit override, then Workers Builds' own build-container
 * variable, then Vercel's. Left undefined (never `""`) when none is set, e.g.
 * local dev — see `resolveBuildSha` in `src/lib/buildInfo.ts`, which this
 * value feeds as the `explicit` source.
 */
const gitCommitSha =
  process.env.GIT_COMMIT_SHA ||
  process.env.WORKERS_CI_COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  undefined;

/**
 * Values baked into the bundle at build time via Next's `env` config (see
 * https://nextjs.org/docs/app/api-reference/config/next-config-js/env —
 * webpack/Turbopack DefinePlugin-style literal replacement, evaluated once
 * here at config load, not at request time).
 *
 * `BUILD_TIME` exists because on Cloudflare Workers a module-load timestamp
 * is isolate-start time, not deploy time — isolates restart independently of
 * deploys, often on the very request that reads it, which is why the admin
 * `sysinfo`/`uptime` commands were reporting "just now" no matter how long
 * the build had actually been live. Baking it at build time fixes that.
 */
const buildTimeEnv: NextConfig["env"] = {
  BUILD_TIME: new Date().toISOString(),
  ...(gitCommitSha ? { GIT_COMMIT_SHA: gitCommitSha } : {}),
};

const nextConfig: NextConfig = {
  env: buildTimeEnv,
  // Pin the Turbopack workspace root to this repo. Without it, a stray
  // lockfile in a parent directory makes Next infer that parent as the root
  // (breaking file tracing). On Vercel the repo is already the root, so this
  // resolves to the same path and changes nothing there.
  turbopack: {
    root: projectRoot,
  },
  async headers() {
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
  },
  // The GT2 screen-wipe between pavilions needs no config as of Next 16.3:
  // "View transitions work in the App Router with no configuration."
  // `experimental.viewTransition` was removed when the feature went stable, so
  // the flag is gone rather than renamed — the `transitionTypes` props on our
  // Links are now a supported API. Browsers without the View Transitions API,
  // and prefers-reduced-motion users via CSS, still get the hard cut.
};

export default nextConfig;
