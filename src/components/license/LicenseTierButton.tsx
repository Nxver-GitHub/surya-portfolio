import type { License } from "../../../content/licenses";
import { LicenseBadge } from "../gt/LicenseBadge";
import { LiveryStripe } from "../livery/LiveryStripe";

interface LicenseTierButtonProps {
  license: License;
  isActive: boolean;
  onSelect: (id: License["id"]) => void;
  /** Roving-tabindex: only the active tier is in the tab order */
  tabIndex: number;
  buttonRef?: (el: HTMLButtonElement | null) => void;
}

/**
 * One tier tile in the license board. Mirrors the GT2 License Test screen: an
 * enamel tier badge over a stamped plate, active tile lit like `plate-hot`.
 */
export function LicenseTierButton({
  license,
  isActive,
  onSelect,
  tabIndex,
  buttonRef,
}: LicenseTierButtonProps) {
  return (
    <button
      ref={buttonRef}
      type="button"
      role="tab"
      id={`license-tab-${license.id}`}
      aria-selected={isActive}
      aria-controls="license-detail-panel"
      tabIndex={tabIndex}
      onClick={() => onSelect(license.id)}
      className={`${
        isActive ? "plate-hot" : "plate"
      } relative flex w-full flex-col items-center gap-2 px-3 py-4 text-center outline-none transition-[filter] duration-[var(--duration-snap)] ease-[var(--ease-mech)] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-chrome`}
    >
      <LicenseBadge glyph={license.id} livery={license.livery} size={52} />
      <span
        className={`font-display text-sm leading-tight font-bold tracking-wide uppercase ${
          isActive ? "text-asphalt" : "ts-hard text-chrome"
        }`}
      >
        {license.theme}
      </span>
      <span className="w-12">
        <LiveryStripe livery={license.livery} muted={!isActive} />
      </span>
    </button>
  );
}
