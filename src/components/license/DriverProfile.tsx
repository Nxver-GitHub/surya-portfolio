import { resume } from "../../../content/resume";

/**
 * Driver Profile: the résumé plate at the head of the License Center.
 *
 * The trophy wall below proves skills with shipped work; this is the paperwork
 * a hiring manager actually asks for. Two controls only: download (primary
 * hot plate) and view in a new tab (stamped plate). The panel is a stamped
 * console card in the same vocabulary as the tier cards, never a flat field.
 */
export function DriverProfile() {
  return (
    <section
      id="driver-profile"
      aria-labelledby="driver-profile-heading"
      className="plate mt-8 flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6"
    >
      <div className="min-w-0">
        <h2
          id="driver-profile-heading"
          className="ts-hard font-display text-sm font-semibold tracking-[0.25em] text-gt-bright uppercase"
        >
          Driver Profile
        </h2>
        <p className="mt-1 max-w-[48ch] text-base text-ink leading-snug">
          {resume.summary}
        </p>
        <p className="mt-1 font-display text-xs font-semibold tracking-widest text-silver uppercase">
          PDF · {resume.pages} page · Updated {resume.updated}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap gap-3">
        <a
          href={resume.href}
          download={resume.filename}
          className="plate-hot inline-flex items-center gap-2 px-5 py-2.5 font-display text-sm font-bold tracking-widest text-asphalt uppercase outline-none transition-[filter] duration-(--duration-snap) ease-(--ease-mech) hover:brightness-110 focus-visible:ring-2 focus-visible:ring-chrome"
        >
          <span>Download résumé</span>
          <span aria-hidden="true">↓</span>
        </a>
        <a
          href={resume.href}
          target="_blank"
          rel="noopener noreferrer"
          className="plate ts-hard inline-flex items-center gap-2 px-5 py-2.5 font-display text-sm font-bold tracking-widest text-gt-bright uppercase outline-none transition-colors duration-(--duration-snap) ease-(--ease-mech) hover:text-chrome focus-visible:ring-2 focus-visible:ring-gt-bright"
        >
          <span>View</span>
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  );
}
