"use client";

import { useMemo, useState } from "react";
import {
  handCheck,
  verdictLabels,
  type HandCheckVerdict,
} from "../../../content/gtme-handcheck";
import { useReducedMotion } from "../garage/useReducedMotion";
import { LiveryStripe } from "../livery/LiveryStripe";
import { AccountSlot, BlankSlot } from "./handcheck/AccountSlot";
import { SummaryStrip } from "./handcheck/SummaryStrip";
import {
  VerdictLegend,
  type VerdictGroup,
} from "./handcheck/VerdictLegend";
import { verdictOrder } from "./handcheck/verdictStyle";

const accounts = handCheck.accounts;
const documentedCount = accounts.length;
const blankCount = Math.max(0, handCheck.totals.checked - documentedCount);
const blankSlots = Array.from({ length: blankCount }, (_, i) => i);

const CLOSING_LINE =
  "The hypothesis survived 7 of 30. The catalog of how it broke is worth more than the 7.";

/** Immutable set update: never mutate the set already in state. */
function withDomains(
  current: ReadonlySet<string>,
  domains: readonly string[],
  open: boolean,
): ReadonlySet<string> {
  const next = new Set(current);
  for (const domain of domains) {
    if (open) next.add(domain);
    else next.delete(domain);
  }
  return next;
}

/**
 * The recce board. Thirty slots for thirty accounts checked by hand against a
 * single claim: fifteen open to a verdict stamp and the note that earned it,
 * fifteen stay blank because those checks were never written to a file.
 * Working the board is the point, so the tally updates as slots open.
 */
export function HandCheckBoard() {
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());

  const openCount = open.size;
  const allOpen = openCount === documentedCount;

  const heldOpen = useMemo(
    () =>
      accounts.filter(
        (a) => open.has(a.domain) && verdictLabels[a.verdict].holds,
      ).length,
    [open],
  );

  const groups = useMemo<readonly VerdictGroup[]>(
    () =>
      verdictOrder.map((verdict) => {
        const inGroup = accounts.filter((a) => a.verdict === verdict);
        return {
          verdict,
          total: inGroup.length,
          open: inGroup.filter((a) => open.has(a.domain)).length,
        };
      }),
    [open],
  );

  const toggleSlot = (domain: string) => {
    setOpen((current) => withDomains(current, [domain], !current.has(domain)));
  };

  const toggleGroup = (verdict: HandCheckVerdict) => {
    const domains = accounts
      .filter((a) => a.verdict === verdict)
      .map((a) => a.domain);
    setOpen((current) =>
      withDomains(current, domains, !domains.every((d) => current.has(d))),
    );
  };

  const toggleAll = () => {
    setOpen((current) =>
      withDomains(
        current,
        accounts.map((a) => a.domain),
        current.size !== documentedCount,
      ),
    );
  };

  return (
    <section
      aria-labelledby="handcheck-heading"
      className="flex flex-col gap-6"
    >
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="w-20">
            <LiveryStripe livery="subaru555" />
          </span>
          <span className="ts-hard font-display text-xs font-black tracking-[0.24em] text-gt-bright uppercase">
            {handCheck.chrome}
          </span>
        </div>
        <h2
          id="handcheck-heading"
          className="gt-title ts-hard text-2xl text-chrome sm:text-3xl"
        >
          {handCheck.heading}
        </h2>
        <span aria-hidden="true" className="gt-rule w-40" />
      </header>

      <SummaryStrip totals={handCheck.totals} summary={handCheck.summary} />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <button
            type="button"
            onClick={toggleAll}
            className="lozenge ts-hard px-4 py-2 font-display text-xs font-black tracking-[0.18em] text-asphalt uppercase outline-none focus-visible:ring-2 focus-visible:ring-chrome"
          >
            {allOpen ? "Reset" : "Reveal all"}
          </button>
          <p
            aria-live="polite"
            className="font-display text-sm font-bold tracking-wider text-silver uppercase tabular-nums"
          >
            revealed {openCount} of {documentedCount} &middot; held {heldOpen}
          </p>
        </div>
        <VerdictLegend groups={groups} onToggleGroup={toggleGroup} />
      </div>

      <ul className="grid list-none grid-cols-2 items-start gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {accounts.map((account) => (
          <AccountSlot
            key={account.domain}
            account={account}
            revealed={open.has(account.domain)}
            animate={!reducedMotion}
            onToggle={toggleSlot}
          />
        ))}
        {blankSlots.map((i) => (
          <BlankSlot key={`blank-${i}`} />
        ))}
      </ul>

      <p className="max-w-3xl text-base leading-relaxed text-ink">
        {handCheck.undocumentedNote}
      </p>

      {allOpen ? (
        <p
          role="status"
          className="plate ts-hard max-w-3xl px-4 py-3 text-base leading-relaxed text-chrome"
        >
          {CLOSING_LINE}
        </p>
      ) : null}
    </section>
  );
}
