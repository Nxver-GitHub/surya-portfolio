/**
 * presence/types — the React-facing shape of room state. Both UI surfaces
 * (lobby guest rows, world-map ONLINE readout) read this through
 * `usePresence()`; the provider that fills it lives in
 * src/components/presence/PresenceProvider.tsx. Kept separate from the wire
 * protocol so UI code never imports zod or socket details.
 */

import type { Player } from "./protocol";

export type PresenceStatus =
  /** No URL configured, boot gate not passed, or gave up reconnecting. */
  | "offline"
  /** Socket opening or reconnecting; UI treats this like offline. */
  | "connecting"
  /** `hello` received; `you` and `roster` are live. */
  | "online";

export interface PresenceState {
  status: PresenceStatus;
  /** This tab's own player, present only while online. */
  you: Player | null;
  /** Everyone in the room INCLUDING `you`, sorted by callsign. */
  roster: readonly Player[];
}

export const OFFLINE_PRESENCE: PresenceState = {
  status: "offline",
  you: null,
  roster: [],
};
