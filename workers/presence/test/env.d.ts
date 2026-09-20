// Ambient types for the test run only.
//
// `cloudflare:test` (SELF and the isolate helpers) ships with the pool.
/// <reference types="@cloudflare/vitest-pool-workers/types" />

/**
 * `import.meta.glob` is a Vite build-time transform, used by
 * test/no-storage.test.ts to read this package's own sources from inside
 * workerd, where there is no filesystem. Its types normally come from
 * `vite/client`, but pnpm does not hoist Vite into this package (it arrives
 * only as a transitive dependency of vitest), so the one signature used here is
 * declared locally rather than adding a dependency for a type.
 */
interface ImportMeta {
  glob(
    pattern: string,
    options: { query: "?raw"; import: "default"; eager: true },
  ): Record<string, string>;
}
