/**
 * routes — the closed set of page routes the beacon is allowed to count.
 *
 * Page-view telemetry NEVER logs an arbitrary path. Both the server (beacon
 * route zod enum) and the client (PageViewBeacon) validate against this exact
 * list, so the analytics key space is bounded and a caller cannot inject
 * unbounded/garbage keys. Dynamic career-detail paths collapse to `/career`.
 */

/** Every pavilion route plus the world-map home. Keep in sync with `app/`. */
export const KNOWN_ROUTES = [
  "/",
  "/career",
  "/garage",
  "/license-center",
  "/missions",
  "/scapes",
  "/cafe",
  "/lobby",
] as const;

export type KnownRoute = (typeof KNOWN_ROUTES)[number];

/** Fast membership check with a narrowing return. Pure. */
export function isKnownRoute(value: string): value is KnownRoute {
  return (KNOWN_ROUTES as readonly string[]).includes(value);
}

/**
 * Normalize a browser pathname to a known route, or null if it maps to nothing
 * we count. Career-detail pages (`/career/<slug>`) collapse to `/career` so the
 * key cardinality stays bounded. Pure.
 */
export function normalizePathname(pathname: string): KnownRoute | null {
  if (isKnownRoute(pathname)) return pathname;
  if (pathname === "/career" || pathname.startsWith("/career/")) return "/career";
  return null;
}
