"use client";

/**
 * HudOnline — the map HUD's "n Online" readout segment, wrapped with its own
 * Divider exactly like the trailing Open segment in HudTotals. Hidden
 * entirely when presence is not online: a readout, not a control — no link,
 * no button, not a new corner chip (global toggles live in ⚙ OPTIONS only).
 * Divider is duplicated here rather than imported from HudTotals so this
 * stays a self-contained "use client" leaf composed inside the
 * server-rendered HudTotals.
 */

import { usePresence } from "@/lib/presence/usePresence";

function Divider() {
  return (
    <span aria-hidden="true" className="text-steel max-sm:hidden">
      ·
    </span>
  );
}

export function HudOnline() {
  const { status, roster } = usePresence();

  if (status !== "online") {
    return null;
  }

  return (
    <span className="flex items-center gap-x-2.5 sm:gap-x-4">
      <Divider />
      <span className="ts-hard inline-flex items-baseline gap-1.5 text-silver">
        <span className="text-gt-bright tabular-nums">{roster.length}</span>
        Online
      </span>
    </span>
  );
}
