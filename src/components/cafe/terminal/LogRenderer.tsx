"use client";

/**
 * LogRenderer — renders the terminal scrollback lines (E11).
 *
 * CONTRACT STUB for the parallel build: mirrors the original inline rendering
 * from Terminal.tsx. The term/pure workstream upgrades this into the readable
 * formatter: ~65ch measure, paragraph spacing, indented list lines, linkified
 * segments (via linkify.ts — allowlist only), and media cards (line.media,
 * e.g. the portrait). All tones must keep ≥14px (system) / 16px (body) sizes.
 */

import type { LineTone, TerminalLine } from "./terminalLines";

/** Phosphor palette (shared with Terminal's chrome). */
export const PHOSPHOR = "#7dff9b";
export const PHOSPHOR_DIM = "#4fbf6c";
export const PHOSPHOR_USER = "#c8ffd6";
export const PHOSPHOR_ERR = "#ff9d6b";

export function toneColor(tone: LineTone): string {
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

export interface LogRendererProps {
  lines: readonly TerminalLine[];
}

export function LogRenderer({ lines }: LogRendererProps) {
  return (
    <>
      {lines.map((line) => (
        <p
          key={line.id}
          className="break-words whitespace-pre-wrap"
          style={{
            color: toneColor(line.tone),
            fontSize: line.tone === "system" ? 14 : 16,
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {line.media ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={line.media.src}
              alt={line.media.alt}
              width={128}
              height={160}
              style={{ display: "block", margin: "6px 0" }}
            />
          ) : null}
          {line.text || " "}
        </p>
      ))}
    </>
  );
}
