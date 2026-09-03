import {
  verdictLabels,
  type HandCheckVerdict,
} from "../../../../content/gtme-handcheck";
import { liveries } from "../../../../content/liveries";

/**
 * The recce board wears the subaru555 livery: rally blue as the board chrome,
 * the livery yellow as the "this held" accent. Verdicts that broke the
 * hypothesis take the system red on the edge and stay silver in text, which
 * keeps every stamp above the AA contrast floor on the panel black.
 */
const rallyLivery = liveries.subaru555;

export const rallyBlue = rallyLivery.key;
export const rallyYellow = rallyLivery.bars[1] ?? rallyLivery.key;

/** Fixed reading order for the verdict vocabulary: what held, then how it broke. */
export const verdictOrder = [
  "held",
  "sales_led",
  "auth_walled",
  "domain_mismatch",
  "dead_template",
  "scan_blind",
] as const satisfies readonly HandCheckVerdict[];

export interface VerdictStyle {
  /** True when this verdict kept the in-house billing hypothesis alive. */
  holds: boolean;
  /** Edge bar / rim color for the slot. Decorative only, never text. */
  edge: string;
  /** Stamp text color. Both values clear 8:1 on the panel black. */
  stamp: string;
}

export function verdictStyle(verdict: HandCheckVerdict): VerdictStyle {
  const holds = verdictLabels[verdict].holds;
  return {
    holds,
    edge: holds ? rallyYellow : "var(--color-accent)",
    stamp: holds ? rallyYellow : "var(--color-silver)",
  };
}

/** Stable DOM id for a slot's detail region. */
export function slotDetailId(domain: string): string {
  return `handcheck-note-${domain.replace(/[^a-zA-Z0-9]+/g, "-")}`;
}
