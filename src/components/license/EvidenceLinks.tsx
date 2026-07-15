import Link from "next/link";
import type { LicenseTest } from "../../../content/licenses";
import { carById } from "../../../content/cars";
import { missionById } from "../../../content/missions";
import { findEvent } from "../../../content/career";
import { Glyph } from "../gt/Glyph";

const PLATE =
  "plate ts-hard px-3 py-1.5 font-display text-xs font-bold tracking-widest text-gt-bright uppercase outline-none hover:text-chrome focus-visible:ring-2 focus-visible:ring-gt-bright";

/**
 * Cross-links from a license test to the real pages that prove it. Href shapes
 * mirror the rest of the site exactly: Garage uses `/garage?car=<id>`, Career
 * uses `/career/<slug>`, Missions links to `/missions`.
 */
export function EvidenceLinks({ test }: { test: LicenseTest }) {
  const car = test.carId ? carById.get(test.carId) : undefined;
  const mission = test.missionId ? missionById.get(test.missionId) : undefined;
  const careerEvent = test.careerEventId
    ? findEvent(test.careerEventId)
    : null;

  if (!car && !mission && !careerEvent) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {car ? (
        <Link
          href={`/garage?car=${car.id}`}
          className={`${PLATE} inline-flex items-center gap-1.5`}
        >
          <Glyph kind="car" /> {car.name}
        </Link>
      ) : null}
      {mission ? (
        <Link
          href="/missions"
          className={`${PLATE} inline-flex items-center gap-1.5`}
        >
          <Glyph kind="flag" /> {mission.name}
        </Link>
      ) : null}
      {careerEvent ? (
        <Link href={`/career/${careerEvent.event.slug}`} className={PLATE}>
          View replay
        </Link>
      ) : null}
    </div>
  );
}
