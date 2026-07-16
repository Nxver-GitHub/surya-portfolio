"use client";

/**
 * LogRenderer — renders the terminal scrollback lines (E11).
 *
 * Readable formatter: ~65ch measure, blank lines become paragraph spacing,
 * lines starting with "  " or "- " get a small hanging indent, text runs are
 * linkified (allowlist only, via linkify.ts), and `line.media` renders a
 * phosphor-bordered photo card with a CRT scanline overlay. All tones keep
 * ≥14px (system) / 16px (body) sizes — never below 12px anywhere.
 */

import type { LineTone, TerminalLine } from "./terminalLines";
import { linkifySegments } from "./linkify";

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

/** Is this an https:// or mailto: target (as opposed to a site-internal path)? */
function isExternalHref(href: string): boolean {
  return href.startsWith("https://") || href.startsWith("mailto:");
}

/** Render one line's text as plain runs + allowlisted <a> links. */
function LineText({ text }: { text: string }) {
  const segments = linkifySegments(text);
  return (
    <>
      {segments.map((seg, i) =>
        seg.type === "link" && seg.href ? (
          isExternalHref(seg.href) ? (
            <a
              key={i}
              href={seg.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "inherit", textDecoration: "underline" }}
            >
              {seg.text}
            </a>
          ) : (
            <a key={i} href={seg.href} style={{ color: "inherit", textDecoration: "underline" }}>
              {seg.text}
            </a>
          )
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}

/** Small CRT-style scanline overlay drawn over a media card. */
function ScanlineOverlay() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        backgroundImage:
          "repeating-linear-gradient(to bottom, rgba(0,0,0,0.25) 0px, rgba(0,0,0,0.25) 1px, transparent 1px, transparent 3px)",
        mixBlendMode: "multiply",
      }}
    />
  );
}

/** A single line's media card: bordered image + optional caption. */
function MediaCard({ media, caption }: { media: NonNullable<TerminalLine["media"]>; caption: string }) {
  return (
    <div style={{ margin: "6px 0", maxWidth: "65ch" }}>
      <div
        style={{
          position: "relative",
          width: 128,
          aspectRatio: "4 / 5",
          border: `1px solid ${PHOSPHOR_DIM}`,
          boxShadow: `0 0 6px ${PHOSPHOR_DIM}55`,
          overflow: "hidden",
          background: "#050505",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={media.src}
          alt={media.alt}
          style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
        />
        <ScanlineOverlay />
      </div>
      {caption ? (
        <p
          style={{
            color: PHOSPHOR_DIM,
            fontSize: 14,
            lineHeight: 1.4,
            margin: "4px 0 0",
          }}
        >
          {caption}
        </p>
      ) : null}
    </div>
  );
}

export function LogRenderer({ lines }: LogRendererProps) {
  return (
    <>
      {lines.map((line) => {
        if (line.media) {
          return <MediaCard key={line.id} media={line.media} caption={line.text} />;
        }

        // Blank lines act as paragraph spacing rather than an empty row of text.
        if (line.text === "") {
          return <div key={line.id} aria-hidden="true" style={{ height: 12 }} />;
        }

        const isIndented = line.text.startsWith("  ") || line.text.startsWith("- ");

        return (
          <p
            key={line.id}
            className="break-words whitespace-pre-wrap"
            style={{
              color: toneColor(line.tone),
              fontSize: line.tone === "system" ? 14 : 16,
              lineHeight: 1.5,
              margin: 0,
              maxWidth: "65ch",
              paddingLeft: isIndented ? 12 : 0,
              textIndent: isIndented ? -12 : 0,
            }}
          >
            {/* Verbatim lines (attacker-controlled admin log text) bypass the
             * linkifier entirely and render as a literal React text child —
             * escaped by React, with no substring ever promoted to a link. */}
            {line.verbatim ? line.text : <LineText text={line.text} />}
          </p>
        );
      })}
    </>
  );
}
