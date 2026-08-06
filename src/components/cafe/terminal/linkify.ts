/**
 * linkify — split a terminal line into text/link segments (E11).
 *
 * SECURITY CONTRACT: only a strict allowlist ever becomes a link — the site's
 * own internal paths (/garage, /license-center, /career, /missions, /scapes,
 * /cafe, /lobby and subpaths), the exact contact URLs/mailto from
 * content/lobby.ts, and the owner's own proximize.net. Arbitrary model-emitted
 * URLs stay plain text (prompt-injection surface: a model reply must never
 * mint a clickable external link).
 *
 * The invariant that makes lookalikes safe: a match's `href` is always the
 * MATCHED SUBSTRING, which by construction is an exact allowlist entry. Given
 * "https://proximize.net.evil.com", only the allowlisted prefix is linked (to
 * the allowlisted target) and ".evil.com" stays inert plain text — an attacker
 * can never steer an href to a domain that isn't enumerated below.
 */

import { joinControls } from "../../../../content/lobby";
import { proximize } from "../../../../content/proximize";

/** One rendered run of a line: plain text, or an allowlisted link. */
export interface LinkSegment {
  readonly type: "text" | "link";
  readonly text: string;
  /** Present only when type === "link". */
  readonly href?: string;
}

/** Site-internal pavilion roots that may be linkified, including subpaths. */
const INTERNAL_ROOTS = [
  "/garage",
  "/license-center",
  "/career",
  "/missions",
  "/scapes",
  "/cafe",
  "/lobby",
] as const;

/**
 * Every exact external href that may become a link: the contact channels from
 * content/lobby.ts, plus the owner's own pre-launch Proximize URL.
 *
 * Proximize is listed here (rather than being added to `joinControls`) because
 * it is NOT a contact channel — putting it in lobby content would also render
 * it as a Lobby join control and inject it into the system prompt's CONTACT
 * block. This stays an explicit, compile-time enumeration of exact strings:
 * no patterns, no wildcards, nothing model-supplied.
 *
 * Consequence, deliberately accepted: the model can now emit a clickable
 * proximize.net, since the terminal prompt tells it about the launch. That is
 * the owner's own domain and the intended call-to-action.
 */
const ALLOWED_HREFS: readonly string[] = [
  ...joinControls.map((c) => c.href),
  proximize.href,
];

/**
 * Matches a standalone internal path token: one of the allowlisted roots,
 * optionally followed by a subpath, but not glued onto other word characters
 * (so "/garageX" or "foo/garage" as part of a larger token doesn't match —
 * enforced by requiring a non-word/start boundary before, handled by the
 * caller's split, and no leading word char immediately after the root before
 * the subpath separator).
 */
const INTERNAL_PATH_RE = new RegExp(
  `(?<![\\w/])(?:${INTERNAL_ROOTS.map((r) => r.replace("/", "\\/")).join("|")})(?:\\/[A-Za-z0-9._~-]+)*`,
  "g",
);

/** Escape a string for safe use inside a RegExp. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Matches any of the exact allowlisted hrefs (mailto + https URLs). Longest
 * first, so one allowlisted href that prefixes another can never shadow it. */
function buildHrefRe(): RegExp | null {
  if (ALLOWED_HREFS.length === 0) return null;
  const alternatives = [...ALLOWED_HREFS]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|");
  return new RegExp(alternatives, "g");
}

interface Match {
  readonly start: number;
  readonly end: number;
  readonly href: string;
}

/** Find all allowlisted matches (internal paths + exact external hrefs), sorted
 * by position, with overlaps resolved by preferring the earlier/longer match. */
function findMatches(text: string): readonly Match[] {
  const raw: Match[] = [];

  for (const m of text.matchAll(INTERNAL_PATH_RE)) {
    if (m.index === undefined) continue;
    raw.push({ start: m.index, end: m.index + m[0].length, href: m[0] });
  }

  const hrefRe = buildHrefRe();
  if (hrefRe) {
    for (const m of text.matchAll(hrefRe)) {
      if (m.index === undefined) continue;
      raw.push({ start: m.index, end: m.index + m[0].length, href: m[0] });
    }
  }

  // Sort by start ascending, longer match first on ties.
  raw.sort((a, b) => a.start - b.start || b.end - a.end - (a.end - b.end));

  const resolved: Match[] = [];
  let lastEnd = -1;
  for (const match of raw) {
    if (match.start < lastEnd) continue; // overlaps a previously accepted match
    resolved.push(match);
    lastEnd = match.end;
  }
  return resolved;
}

/** Split `text` into segments, linkifying ONLY allowlisted targets. Pure. */
export function linkifySegments(text: string): readonly LinkSegment[] {
  if (text.length === 0) return [{ type: "text", text: "" }];

  const matches = findMatches(text);
  if (matches.length === 0) return [{ type: "text", text }];

  const segments: LinkSegment[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.start > cursor) {
      segments.push({ type: "text", text: text.slice(cursor, match.start) });
    }
    segments.push({ type: "link", text: text.slice(match.start, match.end), href: match.href });
    cursor = match.end;
  }
  if (cursor < text.length) {
    segments.push({ type: "text", text: text.slice(cursor) });
  }

  // Merge adjacent text segments (defensive — shouldn't occur given the loop
  // above, but keeps the invariant explicit and future-proof).
  const merged: LinkSegment[] = [];
  for (const seg of segments) {
    const prev = merged[merged.length - 1];
    if (prev && prev.type === "text" && seg.type === "text") {
      merged[merged.length - 1] = { type: "text", text: prev.text + seg.text };
    } else {
      merged.push(seg);
    }
  }
  return merged;
}
