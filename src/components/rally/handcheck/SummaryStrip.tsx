import { rallyYellow } from "./verdictStyle";

interface Totals {
  readonly checked: number;
  readonly documented: number;
  readonly held: number;
}

interface StatPlateProps {
  value: number;
  label: string;
  /** Accent color for the numeral. Livery yellow marks the surviving column. */
  tone?: string;
  /** Renders the session-provenance dot next to the label. */
  fromSession?: boolean;
}

function StatPlate({ value, label, tone, fromSession }: StatPlateProps) {
  return (
    <div className="plate flex min-w-28 flex-1 flex-col gap-1 px-4 py-3">
      <span
        className="ts-hard font-display text-3xl leading-none font-black tracking-tight"
        style={tone ? { color: tone } : undefined}
      >
        {value}
      </span>
      <span className="flex items-center gap-1.5 font-display text-xs font-bold tracking-[0.18em] text-silver uppercase">
        {label}
        {fromSession ? (
          <>
            <span
              aria-hidden="true"
              title="from the working session"
              className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-gt-bright"
            />
            <span className="sr-only">from the working session</span>
          </>
        ) : null}
      </span>
    </div>
  );
}

interface SummaryStripProps {
  totals: Totals;
  summary: readonly string[];
}

/** Headline counts for the full 30, then the plain-English framing. */
export function SummaryStrip({ totals, summary }: SummaryStripProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-3">
        <StatPlate value={totals.checked} label="Checked by hand" />
        <StatPlate
          value={totals.held}
          label="Held"
          tone={rallyYellow}
          fromSession
        />
        <StatPlate value={totals.documented} label="Documented" />
      </div>
      <div className="flex max-w-3xl flex-col gap-3">
        {summary.map((line) => (
          <p key={line} className="text-base leading-relaxed text-ink">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
