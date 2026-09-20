import type { ReactNode } from "react";
import type { LiveryId } from "../../../content/liveries";
import { LicenseBadge } from "../gt/LicenseBadge";

interface PlayerPlateProps {
  /** 1-2 char glyph on the enamel badge */
  glyph: string;
  livery: LiveryId;
  /** Rendered as the card's h3 (Pixelify uppercase) */
  title: string;
  /** Membership/presence chip text, e.g. "Active", "Former", "GUEST", "YOU" */
  chipLabel: string;
  /** true = hot amber .plate-hot chip (Active / YOU); false = quiet keyline chip */
  chipHot: boolean;
  description: string;
  /** Optional trailing chip row (links, cross-refs) */
  actions?: ReactNode;
}

/**
 * Shared stamped-plate card body for the lobby's player rows: static
 * community/org cards (PlayerListCard) and live guest rows (LiveRacers) both
 * render through this so the chrome — badge, plate, chip, description — stays
 * byte-identical between the two sources of players.
 */
export function PlayerPlate({
  glyph,
  livery,
  title,
  chipLabel,
  chipHot,
  description,
  actions,
}: PlayerPlateProps) {
  return (
    <li className="plate relative flex h-full flex-col gap-3 px-4 py-4">
      <div className="flex items-start gap-3">
        <LicenseBadge glyph={glyph} livery={livery} size={40} muted />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="ts-hard font-display text-sm leading-tight font-bold tracking-wide text-chrome uppercase">
            {title}
          </h3>
          <span
            className={`${
              chipHot
                ? "plate-hot text-asphalt"
                : "ts-hard border border-steel text-silver"
            } w-fit px-1.5 py-0.5 font-display text-xs font-black tracking-widest uppercase`}
          >
            {chipLabel}
          </span>
        </div>
      </div>

      <p className="flex-1 text-sm text-silver">{description}</p>

      {actions}
    </li>
  );
}
