import type { License } from "../../../content/licenses";
import { LicenseBadge } from "../gt/LicenseBadge";
import { LiveryStripe } from "../livery/LiveryStripe";
import { LicenseTestRow } from "./LicenseTestRow";

/** Bare tier glyph for the detail badge (e.g. "IB"), without the "Class " chrome. */
function tierGlyph(id: License["id"]): string {
  return id;
}

/**
 * Detail panel for the selected license tier: its badge and theme, then the
 * list of tests. Rendered in an aria-live region so keyboard users hear the
 * panel update when they change tiers.
 */
export function LicenseDetail({ license }: { license: License }) {
  return (
    <article
      aria-labelledby={`license-detail-${license.id}`}
      className="border border-steel bg-[#0d0d0f] shadow-[2px_3px_0_rgba(0,0,0,0.7)]"
    >
      <LiveryStripe livery={license.livery} />

      <div className="flex flex-col gap-5 p-5">
        <header className="flex items-start gap-4">
          <LicenseBadge glyph={tierGlyph(license.id)} livery={license.livery} />
          <div>
            <h3
              id={`license-detail-${license.id}`}
              className="ts-hard font-display text-xl leading-tight font-bold tracking-wide text-chrome uppercase"
            >
              {license.name}
            </h3>
            <p className="mt-0.5 font-display text-xs font-bold tracking-[0.16em] text-gt-bright uppercase">
              {license.theme}
            </p>
            <p className="mt-2 max-w-prose text-sm text-silver">
              {license.summary}
            </p>
          </div>
        </header>

        <div>
          <h4 className="ts-hard font-display text-xs font-bold tracking-[0.18em] text-silver uppercase">
            License Tests
          </h4>
          <ul className="mt-3 flex list-none flex-col gap-3">
            {license.tests.map((test) => (
              <LicenseTestRow key={test.id} test={test} />
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}
