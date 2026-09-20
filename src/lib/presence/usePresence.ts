"use client";

/**
 * presence/usePresence — the public read hook for presence state. Returns
 * OFFLINE_PRESENCE when no PresenceProvider is mounted, so any component
 * (including in isolated tests, or a future RSC-less render) can call it
 * safely without special-casing a missing provider.
 */

import { useContext } from "react";
import { PresenceContext } from "@/components/presence/PresenceContext";
import { OFFLINE_PRESENCE, type PresenceState } from "./types";

export function usePresence(): PresenceState {
  const state = useContext(PresenceContext);
  return state ?? OFFLINE_PRESENCE;
}
