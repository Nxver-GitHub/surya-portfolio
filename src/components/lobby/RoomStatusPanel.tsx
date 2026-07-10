import type { LiveryId } from "../../../content/liveries";
import type { LobbyRoom, StatusChip } from "../../../content/lobby";
import { LiveryStripe } from "../livery/LiveryStripe";

interface RoomStatusPanelProps {
  room: LobbyRoom;
  chips: readonly StatusChip[];
  livery: LiveryId;
}

/**
 * GT online-lobby room-info block: room name/region on a stamped plate,
 * status chips rendered as lozenges — the "what's this player up to" strip
 * a multiplayer lobby shows before you join.
 */
export function RoomStatusPanel({ room, chips, livery }: RoomStatusPanelProps) {
  return (
    <section
      aria-labelledby="lobby-room-heading"
      className="plate relative overflow-hidden px-5 py-5 md:px-7 md:py-6"
    >
      <LiveryStripe livery={livery} className="absolute inset-x-0 top-0" />

      <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="ts-hard font-display text-xs font-semibold tracking-[0.25em] text-silver uppercase">
            Room
          </p>
          <h2
            id="lobby-room-heading"
            className="gt-title text-3xl text-chrome md:text-4xl"
          >
            {room.name}
          </h2>
          <p className="ts-hard mt-1 font-display text-sm tracking-wide text-silver">
            {room.region}
          </p>
        </div>

        <ul className="flex flex-wrap gap-2" aria-label="Current status">
          {chips.map((chip) => (
            <li key={chip.label}>
              <span className="lozenge ts-hard inline-block px-3 py-1.5 font-display text-xs font-bold tracking-widest text-white uppercase">
                {chip.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
