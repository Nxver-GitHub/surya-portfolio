"use client";

/**
 * LogRenderer — renders the terminal scrollback lines (E11).
 *
 * Readable formatter: ~65ch measure, blank lines become paragraph spacing,
 * lines starting with "  " or "- " get a small hanging indent, text runs are
 * linkified (allowlist only, via linkify.ts), and `line.media` renders a
 * phosphor-bordered photo card with a CRT scanline overlay — clickable to open
 * full size in MediaZoom, since cards are far too small to read. All tones keep
 * ≥14px (system) / 16px (body) sizes — never below 12px anywhere.
 */

import { useCallback, useRef, useState } from "react";
import type { TerminalLine } from "./terminalLines";
import { linkifySegments } from "./linkify";
import { MediaZoom } from "./MediaZoom";
import { PHOSPHOR, PHOSPHOR_DIM, toneColor } from "./phosphor";

/** Phosphor palette (shared with Terminal's chrome). Defined in phosphor.ts —
 * re-exported here so existing importers keep their import path. */
export {
  PHOSPHOR,
  PHOSPHOR_DIM,
  PHOSPHOR_USER,
  PHOSPHOR_ERR,
  toneColor,
} from "./phosphor";

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

/** Default card geometry — the portrait crop. `media.width` / `media.aspect`
 * override it for art with a different shape (e.g. the teaser poster). */
const CARD_WIDTH = 128;
const CARD_ASPECT = "4 / 5";

/** Corner glyph marking a card as enlargeable. Purely decorative — the button
 * carries the real label — so it is hidden from assistive tech. */
function ZoomHint() {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        right: 4,
        bottom: 4,
        width: 18,
        height: 18,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        lineHeight: 1,
        color: PHOSPHOR,
        background: "rgba(2, 6, 4, 0.72)",
        border: `1px solid ${PHOSPHOR_DIM}`,
        pointerEvents: "none",
      }}
    >
      ⤢
    </span>
  );
}

/**
 * A single line's media card: bordered image + optional caption.
 *
 * The image is a BUTTON. Cards are small by necessity — the log measures ~65ch
 * and the docked terminal is painted on a CRT face a few centimetres wide — so
 * clicking (or Entering) one opens it full size in <MediaZoom>. Focus is
 * returned here on close, which is why the trigger ref lives in this component
 * rather than in the viewer.
 */
function MediaCard({ media, caption }: { media: NonNullable<TerminalLine["media"]>; caption: string }) {
  const [zoomed, setZoomed] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setZoomed(false);
    // Restore focus to the card that opened the viewer — without this, focus
    // is stranded on a removed node and the next Tab restarts from the top of
    // the document, dumping a keyboard user out of the terminal entirely.
    triggerRef.current?.focus();
  }, []);

  return (
    <div style={{ margin: "6px 0", maxWidth: "65ch" }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setZoomed(true)}
        aria-label={`Enlarge image: ${media.alt}`}
        style={{
          position: "relative",
          display: "block",
          padding: 0,
          width: media.width ?? CARD_WIDTH,
          aspectRatio: media.aspect ?? CARD_ASPECT,
          border: `1px solid ${PHOSPHOR_DIM}`,
          boxShadow: `0 0 6px ${PHOSPHOR_DIM}55`,
          overflow: "hidden",
          background: "#050505",
          cursor: "zoom-in",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={media.src}
          alt=""
          style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
        />
        <ScanlineOverlay />
        <ZoomHint />
      </button>
      {zoomed ? <MediaZoom media={media} onClose={close} /> : null}
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
