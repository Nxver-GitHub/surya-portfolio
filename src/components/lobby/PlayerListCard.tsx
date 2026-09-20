import Link from "next/link";
import type { PlayerCard } from "../../../content/lobby";
import type { LiveryId } from "../../../content/liveries";
import { PlayerPlate } from "./PlayerPlate";

interface PlayerListCardProps {
  player: PlayerCard;
  livery: LiveryId;
}

/**
 * One entry in the lobby's player list: a community/org card with badge/
 * plate chrome, matching the stamped-plate vocabulary used across the site.
 * The membership chip separates the one community Surya is ACTIVE in from
 * FORMER ones; optional external link and career cross-link render as small
 * chips. Renders through the shared PlayerPlate so this stays byte-identical
 * with the live guest rows in LiveRacers.
 */
export function PlayerListCard({ player, livery }: PlayerListCardProps) {
  const active = player.membership === "active";
  const actions =
    player.link || player.careerEventSlug ? (
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
    ) : null;

  return (
    <PlayerPlate
      glyph="P"
      livery={livery}
      title={player.name}
      chipLabel={active ? "Active" : "Former"}
      chipHot={active}
      description={player.description}
      actions={actions}
    />
  );
}
