"use client";

/**
 * presence/PresenceProvider — owns the one WebSocket per tab that talks to
 * the presence Durable Object (workers/presence, see Docs/story-lobby-presence.md
 * §3-4, local-only). Mounted once in the root layout, inside SoundProvider.
 *
 * Keyless build (`NEXT_PUBLIC_PRESENCE_URL` unset) is a complete no-op: the
 * context value stays OFFLINE_PRESENCE and no socket, timer, or storage
 * access ever happens. When a URL is configured, the provider still waits
 * for the boot gate (`BOOT_SEEN_KEY` in sessionStorage, set by BootSequence)
 * before it opens a socket, since the boot gate can be passed after this
 * provider has already mounted.
 */

import { useCallback, useEffect, useReducer, useRef } from "react";
import { usePathname } from "next/navigation";
import { PresenceContext } from "./PresenceContext";
import { BOOT_SEEN_KEY } from "@/components/boot/BootSequence";
import { locationFromPathname } from "@/lib/presence/locationFromPathname";
import { OFFLINE_PRESENCE, type PresenceState } from "@/lib/presence/types";
import {
  CLOSE_CODES,
  PRESENCE_LIMITS,
  clientMessageSchema,
  serverMessageSchema,
  type Location,
  type Player,
} from "@/lib/presence/protocol";

/** Reconnect policy: 1s → 2 → 4 → 8 → 16s, capped at 30s, 5 attempts max. */
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_CAP_MS = 30000;
const BOOT_POLL_MS = 1000;

type Action =
  | { type: "hello"; you: Player; roster: readonly Player[] }
  | { type: "join"; p: Player }
  | { type: "leave"; id: string }
  | { type: "loc"; id: string; p: Location }
  | { type: "disconnected"; status: "connecting" | "offline" };

function sortByCallsign(roster: readonly Player[]): Player[] {
  return [...roster].sort((a, b) => a.callsign.localeCompare(b.callsign));
}

function reducer(state: PresenceState, action: Action): PresenceState {
  switch (action.type) {
    case "hello":
      return {
        status: "online",
        you: action.you,
        roster: sortByCallsign(action.roster),
      };
    case "join": {
      if (state.roster.some((p) => p.id === action.p.id)) return state;
      return { ...state, roster: sortByCallsign([...state.roster, action.p]) };
    }
    case "leave":
      return { ...state, roster: state.roster.filter((p) => p.id !== action.id) };
    case "loc":
      return {
        ...state,
        roster: state.roster.map((p) =>
          p.id === action.id ? { ...p, location: action.p } : p,
        ),
        you:
          state.you && state.you.id === action.id
            ? { ...state.you, location: action.p }
            : state.you,
      };
    case "disconnected":
      return { status: action.status, you: null, roster: [] };
    default:
      return state;
  }
}

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const url = process.env.NEXT_PUBLIC_PRESENCE_URL;
  const [state, dispatch] = useReducer(reducer, OFFLINE_PRESENCE);
  const pathname = usePathname();

  const wsRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(true);
  const attemptRef = useRef(0);
  const gaveUpRef = useRef(false);
  const helloReceivedRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bootPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentLocRef = useRef<Location>(locationFromPathname(pathname ?? "/"));
  const lastLocSentAtRef = useRef(0);
  const pendingLocRef = useRef<Location | null>(null);
  const locThrottleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendLoc = useCallback((loc: Location) => {
    currentLocRef.current = loc;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !helloReceivedRef.current) return;

    const minGapMs = 1000 / PRESENCE_LIMITS.locPerSecond;
    const now = Date.now();
    const elapsed = now - lastLocSentAtRef.current;

    const doSend = (value: Location) => {
      const currentWs = wsRef.current;
      if (!currentWs || currentWs.readyState !== WebSocket.OPEN) return;
      const parsed = clientMessageSchema.safeParse({ t: "loc", p: value });
      if (!parsed.success) return;
      try {
        currentWs.send(JSON.stringify(parsed.data));
        lastLocSentAtRef.current = Date.now();
      } catch {
        /* socket rejected the send; the close handler will follow up */
      }
    };

    if (elapsed >= minGapMs) {
      pendingLocRef.current = null;
      doSend(loc);
      return;
    }

    // Throttled: remember the latest value and flush it once the window opens.
    pendingLocRef.current = loc;
    if (locThrottleTimerRef.current) return;
    locThrottleTimerRef.current = setTimeout(() => {
      locThrottleTimerRef.current = null;
      const value = pendingLocRef.current;
      pendingLocRef.current = null;
      if (value !== null) doSend(value);
    }, minGapMs - elapsed);
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (!url) {
      return () => {
        mountedRef.current = false;
      };
    }

    function clearReconnectTimer() {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    }

    function scheduleReconnect() {
      if (gaveUpRef.current || !mountedRef.current) return;
      if (attemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
        gaveUpRef.current = true;
        dispatch({ type: "disconnected", status: "offline" });
        return;
      }
      attemptRef.current += 1;
      const delay = Math.min(
        1000 * 2 ** (attemptRef.current - 1),
        RECONNECT_CAP_MS,
      );
      dispatch({ type: "disconnected", status: "connecting" });
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, delay);
    }

    function connect() {
      if (!mountedRef.current || gaveUpRef.current) return;
      helloReceivedRef.current = false;

      let ws: WebSocket;
      try {
        ws = new WebSocket(url as string);
      } catch {
        scheduleReconnect();
        return;
      }
      wsRef.current = ws;

      ws.onmessage = (event) => {
        if (!mountedRef.current || wsRef.current !== ws) return;
        let parsed: unknown;
        try {
          parsed = JSON.parse(
            typeof event.data === "string" ? event.data : "",
          );
        } catch {
          return;
        }
        const result = serverMessageSchema.safeParse(parsed);
        if (!result.success) return;
        const msg = result.data;

        switch (msg.t) {
          case "hello":
            helloReceivedRef.current = true;
            attemptRef.current = 0;
            dispatch({ type: "hello", you: msg.you, roster: msg.roster });
            sendLoc(currentLocRef.current);
            break;
          case "join":
            dispatch({ type: "join", p: msg.p });
            break;
          case "leave":
            dispatch({ type: "leave", id: msg.id });
            break;
          case "loc":
            dispatch({ type: "loc", id: msg.id, p: msg.p });
            break;
          case "full":
            gaveUpRef.current = true;
            break;
          default:
            break;
        }
      };

      ws.onerror = () => {
        /* surfaced through close; never throw or log here */
      };

      ws.onclose = (event) => {
        if (wsRef.current === ws) wsRef.current = null;
        if (!mountedRef.current) return;
        if (event.code === CLOSE_CODES.full) {
          gaveUpRef.current = true;
          dispatch({ type: "disconnected", status: "offline" });
          return;
        }
        scheduleReconnect();
      };
    }

    function tryStart(): boolean {
      let seen = false;
      try {
        seen = sessionStorage.getItem(BOOT_SEEN_KEY) === "1";
      } catch {
        seen = false;
      }
      if (!seen) return false;
      if (bootPollRef.current) {
        clearInterval(bootPollRef.current);
        bootPollRef.current = null;
      }
      connect();
      return true;
    }

    if (!tryStart()) {
      bootPollRef.current = setInterval(tryStart, BOOT_POLL_MS);
    }

    return () => {
      mountedRef.current = false;
      if (bootPollRef.current) {
        clearInterval(bootPollRef.current);
        bootPollRef.current = null;
      }
      clearReconnectTimer();
      if (locThrottleTimerRef.current) {
        clearTimeout(locThrottleTimerRef.current);
        locThrottleTimerRef.current = null;
      }
      if (wsRef.current) {
        const ws = wsRef.current;
        wsRef.current = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        ws.close();
      }
    };
  }, [url, sendLoc]);

  useEffect(() => {
    sendLoc(locationFromPathname(pathname ?? "/"));
  }, [pathname, sendLoc]);

  return (
    <PresenceContext.Provider value={state}>
      {children}
    </PresenceContext.Provider>
  );
}
