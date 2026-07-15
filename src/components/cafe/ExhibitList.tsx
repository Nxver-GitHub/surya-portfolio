"use client";

import type { Exhibit } from "../../../content/cafe-exhibits";

interface ExhibitListProps {
  /** Only the exhibits whose glb loaded — the UI never lists dead pieces. */
  available: readonly Exhibit[];
  /** The focused exhibit id, if any (for the pressed/active state). */
  activeId: string | null;
  onSelect: (exhibit: Exhibit) => void;
}

/**
 * The "On display" section: one keyboard-operable button per AVAILABLE exhibit,
 * driving the same focus state as clicking the piece in the 3D scene. Uses the
 * shared GT2 plate vocabulary. Renders NOTHING when the roster is empty (no
 * empty-state chrome) — so with the ships-empty roster it's invisible.
 */
export function ExhibitList({ available, activeId, onSelect }: ExhibitListProps) {
  if (available.length === 0) return null;

  return (
    <section aria-label="On display" className="flex flex-col gap-2">
      <h3 className="font-display text-xs font-black tracking-[0.18em] text-gt-bright uppercase">
        On display
      </h3>
      <div className="flex flex-wrap gap-2">
        {available.map((exhibit) => {
          const isActive = exhibit.id === activeId;
          return (
            <button
              key={exhibit.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelect(exhibit)}
              className={`${
                isActive ? "plate-hot" : "plate ts-hard"
              } flex flex-col gap-0.5 px-3 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-chrome`}
            >
              <span
                className={`font-display text-xs font-bold tracking-wide uppercase ${
                  isActive ? "text-asphalt" : "text-chrome"
                }`}
              >
                {exhibit.name}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
