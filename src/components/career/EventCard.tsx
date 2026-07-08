import Link from "next/link";
import type { CareerEvent } from "../../../content/career";

/** Orange small-caps label over a white value — the GT2 HUD field. */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="font-display text-xs font-bold tracking-[0.18em] text-gt-bright uppercase">
        {label}
      </dt>
      <dd className="ts-hard truncate text-sm text-chrome" title={value}>
        {value}
      </dd>
    </div>
  );
}

export function EventCard({ event }: { event: CareerEvent }) {
  return (
    <Link
      href={`/career/${event.slug}`}
      className="group block border border-steel bg-panel shadow-[2px_3px_0_rgba(0,0,0,0.7)] outline-none transition-colors duration-(--duration-snap) hover:border-gt focus-visible:ring-2 focus-visible:ring-gt-bright"
    >
      <div className="p-4">
        <h3 className="ts-hard font-display text-xl font-bold tracking-wide text-chrome uppercase group-hover:text-gt-bright">
          {event.title}
        </h3>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          <Field label="Track" value={event.org} />
          <Field label="Team" value={event.role} />
          <Field label="Stint" value={event.dates} />
        </dl>
        <div className="mt-3">
          <dt className="font-display text-xs font-bold tracking-[0.18em] text-gt-bright uppercase">
            Result
          </dt>
          <dd className="ts-hard text-sm text-chrome">{event.result}</dd>
        </div>
        <p className="mt-3 text-right font-display text-sm font-bold tracking-widest text-gt-bright uppercase opacity-0 transition-opacity duration-(--duration-snap) group-hover:opacity-100 group-focus-visible:opacity-100">
          View replay →
        </p>
      </div>
    </Link>
  );
}
