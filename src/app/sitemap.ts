import type { MetadataRoute } from "next";
import { allEventSlugs } from "../../content/career";
import { KNOWN_ROUTES } from "@/lib/routes";
import { SITE_URL } from "@/lib/site";

/**
 * All 8 static pavilion/home routes plus every career/[slug] deep link.
 * KNOWN_ROUTES and allEventSlugs are the same content-file sources the
 * beacon and career route already use, so the sitemap can't drift from the
 * actual route set.
 */
type SitemapEntry = MetadataRoute.Sitemap[number];

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries: SitemapEntry[] = KNOWN_ROUTES.map(
    (route): SitemapEntry => ({
      url: `${SITE_URL}${route}`,
      changeFrequency: route === "/" ? "weekly" : "monthly",
      priority: route === "/" ? 1 : 0.7,
    }),
  );

  const careerEntries: SitemapEntry[] = allEventSlugs.map(
    (slug): SitemapEntry => ({
      url: `${SITE_URL}/career/${slug}`,
      changeFrequency: "monthly",
      priority: 0.6,
    }),
  );

  return [...staticEntries, ...careerEntries];
}
