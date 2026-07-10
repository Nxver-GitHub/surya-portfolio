import type { Photo } from "../../../content/photos";
import { carById } from "../../../content/cars";
import { missionById } from "../../../content/missions";
import { findEvent } from "../../../content/career";

/** A resolved cross-reference chip pointing at another pavilion. */
export interface CrossLink {
  /** Stable key for React lists */
  key: string;
  /** Destination href — matches how garage/missions/career cross-link today */
  href: string;
  /** Short chip label */
  label: string;
}

/**
 * Resolve a photo's optional cross-refs into link chips. Only refs that
 * resolve to real content produce a chip — dangling ids are dropped, never
 * rendered as dead links. Href patterns mirror the rest of the site:
 *   car     → /garage?car=<id>
 *   mission → /missions
 *   career  → /career/<slug>
 */
export function crossLinksForPhoto(photo: Readonly<Photo>): readonly CrossLink[] {
  const links: CrossLink[] = [];

  if (photo.carId) {
    const car = carById.get(photo.carId);
    if (car) {
      links.push({
        key: `car-${car.id}`,
        href: `/garage?car=${car.id}`,
        label: car.name,
      });
    }
  }

  if (photo.missionId) {
    const mission = missionById.get(photo.missionId);
    if (mission) {
      links.push({
        key: `mission-${mission.id}`,
        href: "/missions",
        label: mission.name,
      });
    }
  }

  if (photo.careerEventId) {
    const found = findEvent(photo.careerEventId);
    if (found) {
      links.push({
        key: `career-${found.event.slug}`,
        href: `/career/${found.event.slug}`,
        label: found.event.title,
      });
    }
  }

  return links;
}
