import { reasonCodes, reasonCodesNote } from "../../../content/gtme";
import { LiveryStripe } from "../livery/LiveryStripe";
import { SSDoorPlate } from "./SSDoorPlate";

/**
 * The five-code table, the teaching artifact of the Reason Codes stage.
 * Rendered as a real table: a three-column grid on wider screens, and a
 * stacked card per code on mobile so nothing ever scrolls horizontally.
 * The codes are stamped on rally door plates because they are results-sheet
 * vocabulary, the same place DNS and DNF come from.
 */
export function ReasonCodeBoard() {
  return (
    <section
      aria-label="The five reason codes"
      className="mt-4 border border-steel bg-panel"
    >
      <LiveryStripe livery="subaru555" />
      <div className="p-4 sm:p-5">
        <div
          aria-hidden="true"
          className="hidden border-b border-steel pb-2 sm:grid sm:grid-cols-[6.5rem_1fr_1.2fr] sm:gap-4"
        >
          <p className="font-display text-xs font-bold tracking-[0.18em] text-silver uppercase">
            Code
          </p>
          <p className="font-display text-xs font-bold tracking-[0.18em] text-silver uppercase">
            Means
          </p>
          <p className="font-display text-xs font-bold tracking-[0.18em] text-silver uppercase">
            The tell
          </p>
        </div>

        <ul className="flex flex-col">
          {reasonCodes.map((rc) => (
            <li
              key={rc.code}
              className="flex flex-col gap-2 border-b border-steel py-3 last:border-b-0 sm:grid sm:grid-cols-[6.5rem_1fr_1.2fr] sm:gap-4"
            >
              <div className="self-start">
                <SSDoorPlate code={rc.code} size="sm" />
              </div>
              <p className="max-w-[52ch] text-base text-ink leading-snug">
                {rc.means}
              </p>
              <div className="max-w-[52ch]">
                <p
                  aria-hidden="true"
                  className="font-display text-[11px] font-bold tracking-[0.18em] text-silver uppercase sm:hidden"
                >
                  The tell
                </p>
                <p className="text-base text-ink leading-snug">{rc.tell}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="ts-hard border-t border-steel px-4 py-3 font-title text-base text-chrome italic sm:px-5">
        {reasonCodesNote}
      </p>
    </section>
  );
}
