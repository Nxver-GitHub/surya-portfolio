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
};

export default nextConfig;
