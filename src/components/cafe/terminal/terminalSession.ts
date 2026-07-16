"use client";

/**
 * terminalSession — module-level session store for the café terminal (E11).
 *
 * The terminal's session (scrollback, login step, turn count, command history)
 * must survive the Terminal component unmounting when the visitor closes it —
 * reopening restores the conversation for the rest of the page visit. React
 * state inside the component can't do that, so the session lives here as a
 * tiny external store consumed via `useSyncExternalStore`.
 *
 * State VALUES are immutable — every update swaps a frozen-shape copy; only
 * the module-level reference rotates (the sanctioned external-store pattern).
 * Pure helpers + a reset make the store directly unit-testable.
 */

import { useSyncExternalStore } from "react";
import type { TerminalLine } from "./terminalLines";

/** Where the login flow stands. `login` = awaiting account name,
 * `password` = admin password prompt (verified against /api/admin/login),
 * `authed` = guest shell, `admin` = authenticated admin console. */
export type LoginState = "login" | "password" | "authed" | "admin";

export interface TerminalSessionState {
  /** Full ordered scrollback (boot, login, echoes, replies, errors). */
  readonly lines: readonly TerminalLine[];
  /** Login-fiction step. */
  readonly login: LoginState;
  /** User chat turns spent against the per-session cap. */
  readonly userTurns: number;
  /** Previously submitted inputs, oldest → newest (for ↑/↓ cycling). */
  readonly history: readonly string[];
  /** Whether the cold boot has already played this visit. */
  readonly booted: boolean;
}

const INITIAL_STATE: TerminalSessionState = {
  lines: [],
  login: "login",
  userTurns: 0,
  history: [],
  booted: false,
};

let state: TerminalSessionState = INITIAL_STATE;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/** Current session snapshot (stable reference between updates). */
export function getTerminalSession(): TerminalSessionState {
  return state;
}

/** Subscribe to session changes; returns the unsubscribe. */
export function subscribeTerminalSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Shallow-merge a patch into the session (immutably) and notify. */
export function patchTerminalSession(
  patch: Partial<TerminalSessionState>,
): void {
  state = { ...state, ...patch };
  emit();
}

/** Append lines to the scrollback (no-op on an empty batch). */
export function appendSessionLines(toAdd: readonly TerminalLine[]): void {
  if (toAdd.length === 0) return;
  patchTerminalSession({ lines: [...state.lines, ...toAdd] });
}

/** Wipe only the visible scrollback (`clear` command) — login/turns/history stay. */
export function clearSessionLines(): void {
  patchTerminalSession({ lines: [] });
}

/** Record a submitted input for ↑/↓ history (skips empty + immediate dupes). */
export function pushSessionHistory(input: string): void {
  const trimmed = input.trim();
  if (trimmed.length === 0) return;
  if (state.history[state.history.length - 1] === trimmed) return;
  patchTerminalSession({ history: [...state.history, trimmed] });
}

/** Full reset to the cold-boot state. For tests (and a future hard reboot). */
export function resetTerminalSession(): void {
  state = INITIAL_STATE;
  emit();
}

/** React binding — re-renders on any session change. */
export function useTerminalSession(): TerminalSessionState {
  return useSyncExternalStore(
    subscribeTerminalSession,
    getTerminalSession,
    getTerminalSession,
  );
}
