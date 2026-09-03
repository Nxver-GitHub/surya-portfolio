"use client";

import {
  verdictLabels,
  type HandCheckAccount,
} from "../../../../content/gtme-handcheck";
import { slotDetailId, verdictStyle } from "./verdictStyle";

interface AccountSlotProps {
  account: HandCheckAccount;
  revealed: boolean;
  /** Hard cut when false: no transition classes are attached at all. */
  animate: boolean;
  onToggle: (domain: string) => void;
}

/**
 * One documented account. The face carries the company and its domain in plate
 * styling; activating it stamps the verdict and slides the note open on a
 * single straight-line 200ms move.
 */
export function AccountSlot({
  account,
  revealed,
  animate,
  onToggle,
}: AccountSlotProps) {
  const verdict = verdictLabels[account.verdict];
  const style = verdictStyle(account.verdict);
  const detailId = slotDetailId(account.domain);

  return (
    <li className="flex">
      <div className="flex w-full flex-col border border-steel bg-[#0d0d0f] shadow-[2px_3px_0_rgba(0,0,0,0.7)]">
        <span
          aria-hidden="true"
          className="block h-1 w-full shrink-0"
          style={{ background: revealed ? style.edge : "var(--color-steel)" }}
        />
        <button
          type="button"
          onClick={() => onToggle(account.domain)}
          aria-expanded={revealed}
          aria-controls={detailId}
          className="plate flex w-full flex-col items-start gap-1 px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-chrome"
        >
          <span className="ts-hard w-full font-display text-base leading-tight font-bold tracking-wide text-chrome uppercase">
            {account.company}
          </span>
          <span className="w-full text-sm break-all text-silver">
            {account.domain}
          </span>
          <span
            className="ts-hard mt-1 inline-block border px-1.5 py-0.5 font-display text-xs font-black tracking-[0.16em] uppercase"
            style={
              revealed
                ? { color: style.stamp, borderColor: style.edge }
                : {
                    color: "var(--color-silver)",
                    borderColor: "var(--color-steel)",
                  }
            }
          >
            {revealed ? verdict.label : "Open check"}
          </span>
        </button>
        <div
          id={detailId}
          aria-hidden={!revealed}
          className={`grid ${
            animate
              ? "transition-[grid-template-rows,opacity] duration-(--duration-slide) ease-(--ease-mech)"
              : ""
          } ${revealed ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="flex flex-col gap-2 px-3 pt-2 pb-3">
              <p className="font-display text-xs font-semibold tracking-wider text-silver uppercase">
                {verdict.description}
              </p>
              <p className="text-base leading-relaxed text-ink">
                {account.note}
              </p>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * A check that happened and never reached a file. Non-interactive by design:
 * there is nothing behind it to open.
 */
export function BlankSlot() {
  return (
    <li className="flex">
      <div
        aria-disabled="true"
        className="flex w-full flex-col items-start gap-1 border border-dashed border-steel bg-[#0d0d0f]/60 px-3 py-2.5"
      >
        <span
          aria-hidden="true"
          className="mt-1.5 mb-2 block h-1 w-8 shrink-0 bg-steel"
        />
        <span className="ts-hard font-display text-xs font-bold tracking-[0.16em] text-silver uppercase">
          Not written down
        </span>
      </div>
    </li>
  );
}
