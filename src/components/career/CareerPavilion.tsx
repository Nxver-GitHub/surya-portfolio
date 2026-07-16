"use client";

import { useState } from "react";
import { seasons, type Season } from "../../../content/career";
import { GtTitle } from "@/components/gt/GtChrome";
import { CareerBoard } from "./CareerBoard";

/**
 * Career pavilion shell (client). Owns the selected-season state; the index
 * page stays untinted (season warmth is scoped to the detail pages), the
 * board reads the same state to accent the selected season card.
 */
export function CareerPavilion() {
  const [selected, setSelected] = useState<Season>(
    seasons[seasons.length - 1],
  );

  return (
    <>
      <div className="mt-10 md:mt-12">
        <GtTitle kicker="Story mode">Career</GtTitle>
      </div>

      <p className="mt-3 max-w-[52ch] text-base text-ink leading-snug">
        Three seasons so far: community college, university, and the post-grad
        Bay Area era. Pick a season, open an event, read the race report.
      </p>

      <CareerBoard selected={selected} onSelect={setSelected} />
    </>
  );
}
