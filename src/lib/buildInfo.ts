/**
 * Build identity for the admin console's sysinfo panel.
 *
 * Vercel exposes the git SHA at runtime as `VERCEL_GIT_COMMIT_SHA`. Cloudflare
 * Workers has no equivalent: `WORKERS_CI_COMMIT_SHA` exists only in the *build*
 * environment, and `process.env` inside a Worker carries just the wrangler
 * `vars` and secrets, so reading it at request time yields nothing. The runtime
 * identifier there is the `CF_VERSION_METADATA` binding, whose `id` is a
 * Cloudflare *version UUID* rather than a commit hash.
 *
 * So the value means slightly different things per platform, and the resolver
 * below is explicit about the order rather than hiding it behind `??` chains at
 * the call site. `GIT_COMMIT_SHA` is checked first so a real commit hash can be
 * wired in later as a Workers Builds variable without touching this code.
 */

/** Returned when no platform supplies any build identifier (local dev). */
export const SHA_FALLBACK = "dev";

/**
 * Pick the best available build identifier. Pure — every source is passed in,
 * so this is unit-tested without a platform.
 *
 * Order: explicit override, then Vercel's git SHA, then Cloudflare's version
 * id, then the local-dev fallback. Blank and whitespace-only values are treated
 * as absent, because an unset build variable commonly arrives as "".
 */
export function resolveBuildSha(sources: {
  explicit?: string | undefined;
  vercelGitSha?: string | undefined;
  cloudflareVersionId?: string | undefined;
}): string {
  const ordered = [
    sources.explicit,
    sources.vercelGitSha,
    sources.cloudflareVersionId,
  ];
  for (const candidate of ordered) {
    if (candidate && candidate.trim()) return candidate.trim();
  }
  return SHA_FALLBACK;
}

/**
 * Read the Cloudflare version id, or `undefined` anywhere that is not a Worker.
 *
 * `getCloudflareContext()` throws off-Workers (including during a Vercel build
 * and in unit tests), which is the normal path while both platforms serve
 * traffic — so the throw is swallowed rather than logged. The import is dynamic
 * and `require`-free so bundling for Vercel never pulls the adapter in.
 */
export async function readCloudflareVersionId(): Promise<string | undefined> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    const metadata = (ctx.env as Record<string, unknown>).CF_VERSION_METADATA;
    if (metadata && typeof metadata === "object" && "id" in metadata) {
      const id = (metadata as { id?: unknown }).id;
      return typeof id === "string" ? id : undefined;
    }
    return undefined;
  } catch {
    // Not running on Workers. Expected on Vercel and in tests.
    return undefined;
  }
}

/** What `sysinfo` reports when the request is served by the OpenNext Worker. */
export const PLATFORM_WORKERS = "Cloudflare Workers (OpenNext)";

/** What it reports anywhere else — local `next dev`, `next start`, tests. */
export const PLATFORM_NODE = "Node.js (non-Workers runtime)";

/** Name the runtime from the detection flag. Pure, so it is unit-tested. */
export function resolvePlatform(onWorkers: boolean): string {
  return onWorkers ? PLATFORM_WORKERS : PLATFORM_NODE;
}

/**
 * True when this request is being served by the Worker on Cloudflare.
 *
 * Detected by whether `getCloudflareContext()` resolves at all — NOT by the
 * presence of any one binding — so removing or renaming a binding can never
 * make production misreport itself as local. Same dynamic, `require`-free
 * import as {@link readCloudflareVersionId}, for the same bundling reason.
 */
export async function isCloudflareWorkers(): Promise<boolean> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    await getCloudflareContext({ async: true });
    return true;
  } catch {
    return false;
  }
}

/** Resolve the runtime name from the ambient platform. */
export async function getPlatform(): Promise<string> {
  return resolvePlatform(await isCloudflareWorkers());
}

/** Resolve the build identifier from the ambient platform. */
export async function getBuildSha(): Promise<string> {
  return resolveBuildSha({
    explicit: process.env.GIT_COMMIT_SHA,
    vercelGitSha: process.env.VERCEL_GIT_COMMIT_SHA,
    cloudflareVersionId: await readCloudflareVersionId(),
  });
}
