/**
 * site — single source of truth for the site's canonical absolute URL.
 *
 * The custom domain (suryapugaz.com) is pending purchase; every consumer
 * (metadataBase, sitemap, robots, OG image labels) reads this constant so
 * flipping the env var is the only change needed once the domain is live.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://suryapugaz.com";

/** Bare host label for OG card footers, e.g. "SURYAPUGAZ.COM". */
export const SITE_LABEL = new URL(SITE_URL).host.toUpperCase();
