"use client";

/**
 * Terminal — the green-phosphor overlay panel for the café's house terminal.
 *
 * A readable, fully keyboard-driven CRT terminal framed in GT chrome:
 *   - Scrollback log (`role="log"`, `aria-live="polite"`) with tone-styled rows.
 *   - A prompt line with a blinking caret and a labelled text input.
 *   - Autofocus on open; Escape closes (back to room view).
 *   - Phosphor look via CSS: near-black bg, phosphor-green text, scanlines from
 *     a repeating-linear-gradient, a soft glow. Under `prefers-reduced-motion`
 *     the flicker/caret-blink are stilled and text appears instantly.
 *
 * Body copy is ≥16px; dim secondary lines are 14px (never below 12px). All chat
 * logic lives in useTerminalChat; this file is presentation + input handling.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../../garage/useReducedMotion";
import { useTerminalChat } from "./useTerminalChat";
import type { LineTone, TerminalLine } from "./terminalLines";

interface TerminalProps {
  /** Close the terminal (Escape / `exit`) → returns to room view. */
  onClose: () => void;
  /** Report the current scrollback up so the 3D CRT screen can mirror it. */
  onLinesChange?: (lines: readonly TerminalLine[]) => void;
}

/** Phosphor-green palette. Kept local — the terminal is its own visual world
 * inside the GT chrome frame, not part of the orange system palette. */
const PHOSPHOR = "#7dff9b";
const PHOSPHOR_DIM = "#4fbf6c";
const PHOSPHOR_USER = "#c8ffd6";
const PHOSPHOR_ERR = "#ff9d6b";

function toneColor(tone: LineTone): string {
  switch (tone) {
    case "reply":
      return PHOSPHOR;
    case "user":
    case "prompt":
      return PHOSPHOR_USER;
    case "error":
      return PHOSPHOR_ERR;
    case "system":
      return PHOSPHOR_DIM;
  }
}

export function Terminal({ onClose, onLinesChange }: TerminalProps) {
  const reducedMotion = useReducedMotion();
  const { lines, busy, submit } = useTerminalChat({ onExit: onClose });
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Autofocus the input on open so the terminal is usable from the keyboard
  // immediately.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keep the newest line in view as content streams/grows.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  // Mirror the scrollback up to the parent (for the 3D CRT feed).
  useEffect(() => {
    onLinesChange?.(lines);
  }, [lines, onLinesChange]);

  const onSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      const value = input;
      setInput("");
      submit(value);
    },
    [input, submit],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    },
    [onClose],
  );

  return (
    <section
      aria-label="Café terminal"
      onKeyDown={onKeyDown}
      className="relative flex h-full min-h-[320px] flex-col overflow-hidden border border-steel bg-[#03140a] shadow-[2px_3px_0_rgba(0,0,0,0.7)]"
      style={{
        // Soft interior phosphor glow + vignette.
        boxShadow:
          "inset 0 0 60px rgba(20,120,60,0.18), 2px 3px 0 rgba(0,0,0,0.7)",
      }}
    >
      {/* Scanline overlay — pure CSS, no image, CSP-safe. Stilled (no flicker
          animation) always; purely static lines respect reduced motion too. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.28) 0px, rgba(0,0,0,0.28) 1px, transparent 1px, transparent 3px)",
          mixBlendMode: "multiply",
        }}
      />

      {/* Header strip — GT chrome, names the system. */}
      <div className="relative z-20 flex items-center justify-between border-b border-[#12351f] px-3 py-1.5">
        <span
          className="font-display text-[13px] font-bold tracking-[0.2em] uppercase"
          style={{ color: PHOSPHOR_DIM }}
        >
          CAFE-OS v2.2
        </span>
        <button
          type="button"
          onClick={onClose}
          className="lozenge ts-hard px-3 py-0.5 font-display text-[11px] font-bold tracking-widest text-white uppercase outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-chrome"
        >
          Esc ✕
        </button>
      </div>

      {/* Scrollback log */}
      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-label="Terminal output"
        className="relative z-0 flex-1 overflow-y-auto px-3 py-2"
        style={{
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          textShadow: reducedMotion ? "none" : "0 0 4px rgba(125,255,155,0.45)",
        }}
      >
        {lines.map((line) => (
          <p
            key={line.id}
            className="break-words whitespace-pre-wrap"
            style={{
              color: toneColor(line.tone),
              // Body ≥16px; dim system lines 14px (never below 12px).
              fontSize: line.tone === "system" ? 14 : 16,
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {line.text || " "}
          </p>
        ))}
      </div>

      {/* Prompt line */}
      <form
        onSubmit={onSubmit}
        className="relative z-20 flex items-center gap-2 border-t border-[#12351f] px-3 py-2"
      >
        <span
          aria-hidden="true"
          style={{
            color: PHOSPHOR,
            fontFamily: "ui-monospace, monospace",
            fontSize: 16,
          }}
        >
          {busy ? "…" : "▸"}
        </span>
        <label htmlFor="cafe-terminal-input" className="sr-only">
          Type a command or a question for the café terminal
        </label>
        <input
          id="cafe-terminal-input"
          ref={inputRef}
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={500}
          placeholder={busy ? "working…" : "help · projects · contact · ask anything"}
          className="flex-1 bg-transparent outline-none placeholder:opacity-40"
          style={{
            color: PHOSPHOR_USER,
            fontFamily: "ui-monospace, monospace",
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
    </section>
  );
}
