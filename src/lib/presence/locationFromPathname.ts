/**
 * presence/locationFromPathname — pure mapper from a Next.js pathname to a
 * presence `Location`. No React, no browser APIs: importable from node tests
 * and from the client provider alike.
 */

import { pavilions } from "../../../content/pavilions";
import { LOCATION_MAP, locationSchema, type Location } from "./protocol";

const pavilionSlugs: ReadonlySet<string> = new Set(pavilions.map((p) => p.slug));

/**
 * Maps a pathname to a presence Location:
 * - "/" → "map"
 * - "/<slug>" or "/<slug>/..." where slug is a known pavilion slug → that slug
 * - anything else (unknown route, empty string) → "map"
 */
export function locationFromPathname(pathname: string): Location {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];
  if (first && pavilionSlugs.has(first)) {
    const parsed = locationSchema.safeParse(first);
    if (parsed.success) return parsed.data;
  }
  return LOCATION_MAP;
}
