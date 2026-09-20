"use client";

/**
 * presence/PresenceContext — the React context object shared by
 * PresenceProvider (writer) and usePresence (reader). Split into its own
 * module so usePresence.ts (in src/lib/presence) can import the context
 * without importing the provider's socket/effect code.
 */

import { createContext } from "react";
import type { PresenceState } from "@/lib/presence/types";

/** null means "no provider mounted" — usePresence() falls back to OFFLINE_PRESENCE. */
export const PresenceContext = createContext<PresenceState | null>(null);
