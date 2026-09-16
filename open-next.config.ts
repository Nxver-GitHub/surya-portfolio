import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

/**
 * The adapter's template wires an R2-backed incremental cache, which exists to
 * persist pages revalidated at runtime. This app has no ISR surface at all — no
 * `revalidate`, no `unstable_cache`, no `revalidatePath`/`revalidateTag` — so
 * an R2 bucket here would be provisioned and then never written to.
 *
 * It does still need *a* cache, which is not obvious: prerendered route
 * handlers (the 13 opengraph-image/icon routes) are not emitted as plain static
 * files. They land in `.next/server/app/**.body` and are served *through* the
 * incremental cache by the server function. With no cache configured, every
 * lookup misses and Next re-renders the image on demand — which calls
 * `loadOgFonts()`, whose `node:fs` read of `src/fonts/*.ttf` is not in the
 * Worker bundle, and the route 500s.
 *
 * `staticAssetsIncrementalCache` uploads that prerendered output alongside the
 * static assets and serves it read-only from the ASSETS binding. Its own docs
 * scope it to apps that "do NOT want revalidation and ONLY want to serve
 * prerendered data", which is precisely this site.
 */
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
