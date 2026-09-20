"use client";

/**
 * LiveRacers — live guest rows for the lobby's Player List, sourced from
 * usePresence(). Renders nothing while offline/connecting or with an empty
 * roster so the lobby looks exactly as it does today when the presence
 * Worker is unreachable or unconfigured. Rows share PlayerPlate with the
 * static community cards (PlayerListCard) so the chrome matches exactly.
 *
 * "use client" leaf composed inside the server-rendered PlayerList — the
 * static community grid still SSRs and renders identically in the keyless
 * build.
 */

import { usePresence } from "@/lib/presence/usePresence";
import type { Location } from "@/lib/presence/protocol";
import { pavilions } from "../../../content/pavilions";
import { PlayerPlate } from "./PlayerPlate";

const pavilionNameBySlug: ReadonlyMap<string, string> = new Map(
  pavilions.map((p) => [p.slug, p.name]),
);

function locationDescription(location: Location): string {
  if (location === "map") return "On the world map";
  const name = pavilionNameBySlug.get(location) ?? location;
  return `Exploring ${name}`;
}

export function LiveRacers() {
  const { status, you, roster } = usePresence();

  if (status !== "online" || roster.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h3 className="ts-hard font-display text-sm font-semibold tracking-[0.25em] text-silver uppercase">
        Racers online
      </h3>
      <ul
        aria-live="polite"
        aria-label="Racers online"
        className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {roster.map((player) => {
          const isYou = you?.id === player.id;
          return (
            <PlayerPlate
              key={player.id}
              glyph="R"
              livery={player.livery}
              title={player.callsign}
              chipLabel={isYou ? "YOU" : "GUEST"}
              chipHot={isYou}
              description={locationDescription(player.location)}
            />
          );
        })}
      </ul>
    </div>
  );
}
