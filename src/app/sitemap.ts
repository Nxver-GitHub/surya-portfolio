import type { MetadataRoute } from "next";
import { allEventSlugs } from "../../content/career";
import { stageOrder } from "../../content/gtme";
import { KNOWN_ROUTES } from "@/lib/routes";
import { SITE_URL } from "@/lib/site";

/**
 * Every static pavilion/home route plus each career/[slug] and
 * special-stage/[slug] deep link. KNOWN_ROUTES, allEventSlugs and stageOrder
 * are the same content-file sources the beacon and those routes already use,
 * so the sitemap can't drift from the actual route set.
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

  const stageEntries: SitemapEntry[] = stageOrder.map(
    (slug): SitemapEntry => ({
      url: `${SITE_URL}/special-stage/${slug}`,
      changeFrequency: "monthly",
      priority: 0.6,
    }),
  );

  return [...staticEntries, ...careerEntries, ...stageEntries];
}
