import type { PlayerCard } from "../../../content/lobby";
import type { LiveryId } from "../../../content/liveries";
import { PlayerListCard } from "./PlayerListCard";

interface PlayerListProps {
  players: readonly PlayerCard[];
  livery: LiveryId;
}

/** Grid of player cards: the communities and orgs Surya is embedded in. */
export function PlayerList({ players, livery }: PlayerListProps) {
  return (
    <section aria-labelledby="lobby-players-heading" className="mt-10">
      <h2
        id="lobby-players-heading"
        className="ts-hard font-display text-sm font-semibold tracking-[0.25em] text-silver uppercase"
      >
        Player List
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-silver">
        The communities and organizations on Surya&apos;s journey — where he
        is now, and where he came up.
      </p>

      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {players.map((player) => (
          <PlayerListCard key={player.id} player={player} livery={livery} />
        ))}
      </ul>
    </section>
  );
}
