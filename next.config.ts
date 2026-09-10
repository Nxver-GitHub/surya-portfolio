import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// Absolute path to this project directory (where next.config.ts lives).
// fileURLToPath is used instead of import.meta.dirname so it resolves on any
// Node version, both locally and on Vercel.
const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Pin the Turbopack workspace root to this repo. Without it, a stray
  // lockfile in a parent directory makes Next infer that parent as the root
  // (breaking file tracing). On Vercel the repo is already the root, so this
  // resolves to the same path and changes nothing there.
  turbopack: {
    root: projectRoot,
  },
  // The GT2 screen-wipe between pavilions needs no config as of Next 16.3:
  // "View transitions work in the App Router with no configuration."
  // `experimental.viewTransition` was removed when the feature went stable, so
  // the flag is gone rather than renamed — the `transitionTypes` props on our
  // Links are now a supported API. Browsers without the View Transitions API,
  // and prefers-reduced-motion users via CSS, still get the hard cut.
};

export default nextConfig;
