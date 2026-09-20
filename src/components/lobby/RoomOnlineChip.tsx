"use client";

/**
 * RoomOnlineChip — the lobby room's live status chip: "ONLINE <n>" while
 * connected, a quiet "OFFLINE" chip after a connection drops or while
 * reconnecting. Renders nothing when there is no URL configured and the
 * socket has never connected this session, so a keyless build never shows
 * OFFLINE anywhere. Composed as the first <li> in RoomStatusPanel's status
 * chip list — a small "use client" leaf inside an otherwise server-rendered
 * panel.
 */

import { useState } from "react";
import { usePresence } from "@/lib/presence/usePresence";

export function RoomOnlineChip() {
  const { status, roster } = usePresence();
  // Adjusted during render (React's documented pattern for "remember info
  // from a previous status"), not in an effect — avoids the extra render an
  // effect-driven setState would cause.
  const [prevStatus, setPrevStatus] = useState(status);
  const [everOnline, setEverOnline] = useState(status === "online");
  if (status !== prevStatus) {
    setPrevStatus(status);
    if (status === "online") {
      setEverOnline(true);
    }
  }

  if (status === "online") {
    return (
      <li>
        <span className="ts-hard inline-block border border-gt/60 bg-asphalt px-3 py-1.5 font-display text-xs font-bold tracking-widest text-chrome uppercase tabular-nums">
          Online {roster.length}
        </span>
      </li>
    );
  }

  if (status === "connecting" || everOnline) {
    return (
      <li>
        <span className="ts-hard inline-block border border-steel bg-asphalt px-3 py-1.5 font-display text-xs font-bold tracking-widest text-silver uppercase">
          Offline
        </span>
      </li>
    );
  }

  return null;
}
