import type { MetadataRoute } from "next";
import { AI_CRAWLERS } from "@/lib/crawlers";
import { SITE_URL } from "@/lib/site";

/*
 * AI crawlers, named explicitly. `*` already allows them; listing them records
 * the owner's decision (2026-10-03): both live-answer/search agents AND model
 * training crawlers are welcome, because being known to the models is the
 * point of a portfolio. Each gets the same rule as everyone else — the /api/
 * routes stay disallowed for every bot (they are also origin-guarded and
 * rate-limited server-side, so this is politeness, not the protection).
 */

/**
 * /api/: server routes. /md/: the internal target of the `<page>.md` rewrite —
 * crawlers should fetch the public `.md` URLs, not a duplicate tree.
 */
const DISALLOW = ["/api/", "/md/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOW,
      },
      {
        userAgent: [...AI_CRAWLERS],
        allow: "/",
        disallow: DISALLOW,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
