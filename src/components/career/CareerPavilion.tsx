"use client";

import { useState } from "react";
import { seasons, type Season } from "../../../content/career";
import { GtTitle } from "@/components/gt/GtChrome";
import { CareerBoard } from "./CareerBoard";
import { CareerTitleBand } from "./CareerTitleBand";
import { CAREER_WARMTH_VARIANT } from "./warmth";

/**
 * Career pavilion shell (client). Owns the selected-season state so the
 * Variant A header band can react to selection; the board reads the same state.
 */
export function CareerPavilion() {
  const [selected, setSelected] = useState<Season>(
    seasons[seasons.length - 1],
  );
  const variantA = CAREER_WARMTH_VARIANT === "A";

  return (
    <>
      {variantA ? (
        <CareerTitleBand seasonId={selected.id} kicker="Story mode">
          Career
        </CareerTitleBand>
      ) : (
        <div className="mt-10 md:mt-12">
          <GtTitle kicker="Story mode">Career</GtTitle>
        </div>
      )}

      <p className="mt-3 max-w-[52ch] text-base text-ink leading-snug">
        Three seasons so far: community college, university, and the
        venture-and-agents era. Pick a season, open an event, read the race
        report.
      </p>

      <CareerBoard selected={selected} onSelect={setSelected} />
    </>
  );
}
