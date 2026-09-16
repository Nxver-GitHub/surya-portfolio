/**
 * site — single source of truth for the site's canonical absolute URL.
 *
 * The custom domain (suryapugaz.com) is pending purchase; every consumer
 * (metadataBase, sitemap, robots, OG image labels) reads this constant so
 * flipping the env var is the only change needed once the domain is live.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://suryapugaz.com";

/** Canonical host, lowercase — the origin allow-list entry for the CSRF guard
 * in lib/requestGuards.ts as well as the source of the OG label below. */
export const SITE_HOST = new URL(SITE_URL).host.toLowerCase();

/** Bare host label for OG card footers, e.g. "SURYAPUGAZ.COM". */
export const SITE_LABEL = SITE_HOST.toUpperCase();
