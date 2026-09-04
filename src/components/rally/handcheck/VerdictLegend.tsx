"use client";

import {
  verdictLabels,
  type HandCheckVerdict,
} from "../../../../content/gtme-handcheck";
import { verdictOrder, verdictStyle } from "./verdictStyle";

export interface VerdictGroup {
  verdict: HandCheckVerdict;
  /** Documented accounts carrying this verdict. */
  total: number;
  /** How many of them are currently open. */
  open: number;
}

interface VerdictLegendProps {
  groups: readonly VerdictGroup[];
  onToggleGroup: (verdict: HandCheckVerdict) => void;
}

/**
 * The verdict vocabulary, doubling as a shortcut: each chip opens every slot
 * carrying that verdict, or closes them again once they are all open.
 */
export function VerdictLegend({ groups, onToggleGroup }: VerdictLegendProps) {
  const byVerdict = new Map(groups.map((g) => [g.verdict, g]));

  return (
    <ul className="flex list-none flex-wrap gap-2">
      {verdictOrder.map((verdict) => {
        const group = byVerdict.get(verdict);
        if (!group || group.total === 0) return null;
        const allOpen = group.open === group.total;
        const style = verdictStyle(verdict);
        const meta = verdictLabels[verdict];

        return (
          <li key={verdict}>
            <button
              type="button"
              onClick={() => onToggleGroup(verdict)}
              aria-pressed={allOpen}
              title={meta.description}
              className={`${
                allOpen ? "plate-hot" : "plate"
              } flex items-center gap-2 px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-chrome`}
            >
              <span
                aria-hidden="true"
                className="block h-2 w-2 shrink-0 rounded-full"
                style={{ background: style.edge }}
              />
              <span
                className={`font-display text-xs font-black tracking-[0.14em] uppercase ${
                  allOpen ? "text-asphalt" : "ts-hard text-chrome"
                }`}
              >
                {meta.label}
              </span>
              <span
                className={`font-display text-xs font-bold tabular-nums ${
                  allOpen ? "text-asphalt/80" : "text-silver"
                }`}
              >
                {group.total}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
