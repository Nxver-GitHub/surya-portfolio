import Link from "next/link";
import type { PlayerCard } from "../../../content/lobby";
import type { LiveryId } from "../../../content/liveries";
import { LicenseBadge } from "../gt/LicenseBadge";

interface PlayerListCardProps {
  player: PlayerCard;
  livery: LiveryId;
}

/**
 * One entry in the lobby's player list: a community/org card with badge/
 * plate chrome, matching the stamped-plate vocabulary used across the site.
 * The membership chip separates the one community Surya is ACTIVE in from
 * FORMER ones; optional external link and career cross-link render as small
 * chips.
 */
export function PlayerListCard({ player, livery }: PlayerListCardProps) {
  const active = player.membership === "active";
  return (
    <li className="plate relative flex h-full flex-col gap-3 px-4 py-4">
      <div className="flex items-start gap-3">
        <LicenseBadge glyph="P" livery={livery} size={40} muted />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="ts-hard font-display text-sm leading-tight font-bold tracking-wide text-chrome uppercase">
            {player.name}
          </h3>
          <span
            className={`${
              active
                ? "plate-hot text-asphalt"
                : "ts-hard border border-steel text-silver"
            } w-fit px-1.5 py-0.5 font-display text-xs font-black tracking-widest uppercase`}
          >
            {active ? "Active" : "Former"}
          </span>
        </div>
      </div>

      <p className="flex-1 text-sm text-silver">{player.description}</p>

      {player.link || player.careerEventSlug ? (
        <div className="flex flex-wrap gap-1.5">
          {player.link ? (
            <a
              href={player.link}
              target="_blank"
              rel="noopener noreferrer"
              className="ts-hard inline-flex items-center gap-1 border border-steel px-2.5 py-1 font-display text-xs font-bold tracking-widest text-gt-bright uppercase outline-none hover:text-chrome focus-visible:ring-2 focus-visible:ring-gt-bright"
            >
              <span aria-hidden="true">↗</span>
              <span>Visit</span>
            </a>
          ) : null}
          {player.careerEventSlug ? (
            <Link
              href={`/career/${player.careerEventSlug}`}
              className="ts-hard inline-flex items-center gap-1 border border-steel px-2.5 py-1 font-display text-xs font-bold tracking-widest text-gt-bright uppercase outline-none hover:text-chrome focus-visible:ring-2 focus-visible:ring-gt-bright"
            >
              <span aria-hidden="true">→</span>
              <span>Career</span>
            </Link>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
