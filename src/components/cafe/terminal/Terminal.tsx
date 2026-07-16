"use client";

/**
 * Terminal — the café's house terminal view (E11).
 *
 * A readable, fully keyboard-driven CRT terminal. All chat/login/session logic
 * lives in useTerminalChat, which the PARENT (CafeBrowser) now owns and calls
 * once; this file is presentation + input handling and renders entirely from
 * the passed `chat` controller. It ships in three variants:
 *
 *   - "overlay"  — the flat GT-chrome panel beside/below the 3D scene (the
 *                  original look), with an "Expand" control that hands off to
 *                  the in-screen view via onToggleExpand.
 *   - "screen"   — fills 100% of its container (the 3D CRT tube wrapper another
 *                  agent builds): phosphor styling, a simplified header (no GT
 *                  border — the 3D bezel frames it), the input line, and a
 *                  small "Expand" control to return to the overlay.
 *   - "log-only" — scrollback only, NO input (mobile pairs this with a separate
 *                  bottom input bar via the exported TerminalInputBar).
 *
 * Scrollback rows are rendered exclusively through <LogRenderer>. The log is a
 * live region (role="log", aria-live="polite") in every variant. Body copy is
 * ≥16px; dim secondary lines are 14px (never below 12px). Under
 * prefers-reduced-motion the caret blink is stilled.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useReducedMotion } from "../../garage/useReducedMotion";
import { LogRenderer, PHOSPHOR, PHOSPHOR_DIM, PHOSPHOR_USER } from "./LogRenderer";
import { cycleHistory, HISTORY_CURSOR_HOME, type HistoryCursor } from "./history";
import type { TerminalChatApi } from "./useTerminalChat";

/** Which surface we're rendering. See the module doc for each variant. */
export type TerminalVariant = "overlay" | "screen" | "log-only";

interface TerminalProps {
  /** The shared session controller (owned/called once by the parent). */
  chat: TerminalChatApi;
  /** Which surface to render. */
  variant: TerminalVariant;
  /** Close the terminal (Escape / `exit`) → returns to room view. */
  onClose: () => void;
  /** Toggle between the overlay panel and the in-3D-screen view, if wired. */
  onToggleExpand?: () => void;
  /** Label for the close control. "Esc ✕" fits desktop; the mobile full-screen
   * window passes "Exit ✕" (phones have no Escape key). */
  closeLabel?: string;
}

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

/**
 * Shared input behaviour for every terminal input (the overlay/screen prompt
 * line and the standalone mobile bar): local draft state, ↑/↓ history cycling
 * over the session history with a preserved draft, submit-and-clear, and
 * password masking driven by the login step. Returns everything an <input> +
 * its <form> need. Keeping this in one place is why all three surfaces behave
 * identically no matter which one the visitor types into.
 */
function useTerminalInput(chat: TerminalChatApi) {
  const { submit, busy, login, history } = chat;
  const [input, setInput] = useState("");
  const [cursor, setCursor] = useState<HistoryCursor>(HISTORY_CURSOR_HOME);
  const masked = login === "password";

  const onChange = useCallback((value: string) => {
    setInput(value);
    // Any manual edit drops us back to the live draft (out of history cycling).
    setCursor(HISTORY_CURSOR_HOME);
  }, []);

  const onSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      const value = input;
      setInput("");
      setCursor(HISTORY_CURSOR_HOME);
      submit(value);
    },
    [input, submit],
  );

  // ↑/↓ walk the session history (draft preserved on the way up, restored past
  // the newest entry on the way down). Suppressed while masking a password —
  // passwords are never recorded, so there is nothing to cycle to.
  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (masked) return;
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        const { cursor: next, value } = cycleHistory(
          history,
          cursor,
          event.key === "ArrowUp" ? "up" : "down",
          input,
        );
        setCursor(next);
        setInput(value);
      }
    },
    [cursor, history, input, masked],
  );

  return { input, masked, busy, login, onChange, onSubmit, onKeyDown };
}

/** Prompt caret glyph: "…" while working, "▸" idle. */
function promptGlyph(busy: boolean): string {
  return busy ? "…" : "▸";
}

interface InputLineProps {
  chat: TerminalChatApi;
  /** Unique id so the label/input pair is valid across multiple mounts. */
  inputId: string;
  /** Autofocus this input on mount (the primary input of an opened panel). */
  autoFocus?: boolean;
  reducedMotion: boolean;
}

/** The prompt line: caret glyph + labelled input (+ idle block caret). Shared
 * by the overlay/screen panels and the standalone bar. */
function InputLine({ chat, inputId, autoFocus, reducedMotion }: InputLineProps) {
  const { input, masked, busy, login, onChange, onSubmit, onKeyDown } =
    useTerminalInput(chat);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const placeholder = masked
    ? "password"
    : login === "admin"
      ? "logs · stats · sysinfo · uptime · logout"
      : busy
        ? "working…"
        : "help · projects · contact · ask anything";

  return (
    <div className="relative z-20 border-t border-[#12351f]">
      <form onSubmit={onSubmit} className="flex items-center gap-2 px-3 py-2">
      <span
        aria-hidden="true"
        style={{ color: PHOSPHOR, fontFamily: MONO, fontSize: 16 }}
      >
        {promptGlyph(busy)}
      </span>
      <label htmlFor={inputId} className="sr-only">
        Type a command or a question for the café terminal
      </label>
      <input
        id={inputId}
        ref={inputRef}
        // Masking the admin-password prompt: password field + no autofill.
        type={masked ? "password" : "text"}
        value={input}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        maxLength={500}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none placeholder:opacity-40"
        style={{
          color: PHOSPHOR_USER,
          fontFamily: MONO,
          fontSize: 16,
          caretColor: PHOSPHOR,
        }}
      />
      {/* Blinking block caret (only when idle, and only if motion is allowed). */}
      {!busy && !reducedMotion ? (
        <span aria-hidden="true" className="cafe-caret" style={{ color: PHOSPHOR }}>
          █
        </span>
      ) : null}
      </form>
      {/* Quiet privacy notice — questions are logged anonymously (see
       * lib/events.ts). Silver, 12px, no popup. */}
      <p
        className="px-3 pb-1.5"
        style={{ color: "#9aa6a0", fontFamily: MONO, fontSize: 12 }}
      >
        Questions may be logged anonymously.
      </p>
    </div>
  );
}

/** A small phosphor control button (Esc / Expand) — matches the terminal's own
 * green world rather than the orange GT system palette. */
function ScreenButton({
  onClick,
  children,
  label,
}: {
  onClick: () => void;
  children: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="font-display text-xs font-bold tracking-widest uppercase outline-none hover:brightness-125 focus-visible:ring-2 focus-visible:ring-chrome"
      style={{ color: PHOSPHOR_DIM }}
    >
      {children}
    </button>
  );
}

/** The scrollback log — a live region in every variant. Renders rows through
 * LogRenderer and keeps the newest line in view as content streams/grows. */
function ScrollbackLog({
  chat,
  reducedMotion,
}: {
  chat: TerminalChatApi;
  reducedMotion: boolean;
}) {
  const logRef = useRef<HTMLDivElement>(null);
  const { lines } = chat;

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <div
      ref={logRef}
      role="log"
      aria-live="polite"
      aria-label="Terminal output"
      className="relative z-0 flex-1 overflow-y-auto px-3 py-2"
      style={{
        fontFamily: MONO,
        textShadow: reducedMotion ? "none" : "0 0 4px rgba(125,255,155,0.45)",
      }}
    >
      <LogRenderer lines={lines} />
    </div>
  );
}

/** Static CSS scanline wash (no image, no animation) — CSP-safe. */
function Scanlines() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, rgba(0,0,0,0.28) 0px, rgba(0,0,0,0.28) 1px, transparent 1px, transparent 3px)",
        mixBlendMode: "multiply",
      }}
    />
  );
}

export function Terminal({
  chat,
  variant,
  onClose,
  onToggleExpand,
  closeLabel = "Esc ✕",
}: TerminalProps) {
  const reducedMotion = useReducedMotion();

  // Escape closes from any variant that owns focus (overlay/screen). The
  // log-only variant carries no input/focus of its own, so its container simply
  // omits the handler (the paired input bar carries Escape instead).
  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    },
    [onClose],
  );

  const inputId = useMemo(() => `cafe-terminal-input-${variant}`, [variant]);

  // --- log-only: scrollback surface, no chrome frame, no input. Mobile pairs
  // this with the standalone TerminalInputBar in a separate bottom bar. ---
  if (variant === "log-only") {
    return (
      <section
        aria-label="Café terminal output"
        className="relative flex h-full min-h-[240px] flex-col overflow-hidden bg-[#03140a]"
        style={{
          boxShadow: "inset 0 0 60px rgba(20,120,60,0.18)",
        }}
      >
        <Scanlines />
        <ScrollbackLog chat={chat} reducedMotion={reducedMotion} />
      </section>
    );
  }

  // --- screen: fills its container (the 3D tube wrapper). No GT chrome border
  // (the 3D bezel frames it); simplified header; includes the input line and an
  // Expand-back control. ---
  if (variant === "screen") {
    return (
      <section
        aria-label="Café terminal"
        onKeyDown={onKeyDown}
        className="relative flex h-full w-full flex-col overflow-hidden bg-[#03140a]"
        style={{
          boxShadow: "inset 0 0 70px rgba(20,120,60,0.22)",
        }}
      >
        <Scanlines />
        <div className="relative z-20 flex items-center justify-between px-3 py-1.5">
          <span
            className="font-display text-[13px] font-bold tracking-[0.2em] uppercase"
            style={{ color: PHOSPHOR_DIM }}
          >
            CAFE-OS v2.2
          </span>
          <div className="flex items-center gap-4">
            {onToggleExpand ? (
              <ScreenButton onClick={onToggleExpand} label="Return to panel view">
                Expand ⤡
              </ScreenButton>
            ) : null}
            <ScreenButton onClick={onClose} label="Close terminal">
              {closeLabel}
            </ScreenButton>
          </div>
        </div>
        <ScrollbackLog chat={chat} reducedMotion={reducedMotion} />
        <InputLine
          chat={chat}
          inputId={inputId}
          autoFocus
          reducedMotion={reducedMotion}
        />
      </section>
    );
  }

  // --- overlay (default): the flat GT-chrome panel. Keeps the original look;
  // gains an "Expand" control that hands off to the in-screen view. ---
  return (
    <section
      aria-label="Café terminal"
      onKeyDown={onKeyDown}
      className="relative flex h-full min-h-[320px] flex-col overflow-hidden border border-steel bg-[#03140a]"
      style={{
        boxShadow:
          "inset 0 0 60px rgba(20,120,60,0.18), 2px 3px 0 rgba(0,0,0,0.7)",
      }}
    >
      <Scanlines />

      {/* Header strip — GT chrome, names the system. */}
      <div className="relative z-20 flex items-center justify-between border-b border-[#12351f] px-3 py-1.5">
        <span
          className="font-display text-[13px] font-bold tracking-[0.2em] uppercase"
          style={{ color: PHOSPHOR_DIM }}
        >
          CAFE-OS v2.2
        </span>
        <div className="flex items-center gap-2">
          {onToggleExpand ? (
            <button
              type="button"
              onClick={onToggleExpand}
              aria-label="Expand into the café screen"
              className="lozenge relative px-3 py-0.5 font-display text-xs font-bold tracking-widest text-asphalt uppercase outline-none after:absolute after:inset-x-0 after:inset-y-[-13px] after:content-[''] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-chrome"
            >
              Expand ⤢
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close terminal"
            className="lozenge relative px-3 py-0.5 font-display text-xs font-bold tracking-widest text-asphalt uppercase outline-none after:absolute after:inset-x-0 after:inset-y-[-13px] after:content-[''] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-chrome"
          >
            {closeLabel}
          </button>
        </div>
      </div>

      <ScrollbackLog chat={chat} reducedMotion={reducedMotion} />
      <InputLine
        chat={chat}
        inputId={inputId}
        autoFocus
        reducedMotion={reducedMotion}
      />
    </section>
  );
}

/**
 * TerminalInputBar — a thin, standalone input bar over the same submit path,
 * history cycling and password masking as the panels. Mounted on mobile as a
 * separate bottom bar beneath the (log-only) scrollback, so the on-screen
 * keyboard can't shove the log off-screen. It carries its own Escape handler so
 * the mobile layout can still be dismissed from the keyboard.
 */
export function TerminalInputBar({ chat }: { chat: TerminalChatApi }) {
  const reducedMotion = useReducedMotion();
  return (
    <div
      className="relative bg-[#03140a]"
      style={{ boxShadow: "inset 0 0 30px rgba(20,120,60,0.14)" }}
    >
      <InputLine
        chat={chat}
        inputId="cafe-terminal-input-bar"
        reducedMotion={reducedMotion}
      />
    </div>
  );
}
