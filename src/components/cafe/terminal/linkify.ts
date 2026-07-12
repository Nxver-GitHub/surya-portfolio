/**
 * linkify — split a terminal line into text/link segments (E11).
 *
 * SECURITY CONTRACT: only a strict allowlist ever becomes a link — the site's
 * own internal paths (/garage, /license-center, /career, /missions, /scapes,
 * /cafe, /lobby and subpaths) and the exact contact URLs/mailto from
 * content/lobby.ts. Arbitrary model-emitted URLs stay plain text (prompt-
 * injection surface: a model reply must never mint a clickable external link).
 */

import { joinControls } from "../../../../content/lobby";

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

/** The exact contact hrefs (mailto + externals) sourced from content/lobby.ts. */
const CONTACT_HREFS: readonly string[] = joinControls.map((c) => c.href);

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

/** Matches any of the exact allowlisted contact hrefs (mailto + https URLs). */
function buildContactRe(): RegExp | null {
  if (CONTACT_HREFS.length === 0) return null;
  const alternatives = CONTACT_HREFS.map(escapeRegExp).join("|");
  return new RegExp(alternatives, "g");
}

interface Match {
  readonly start: number;
  readonly end: number;
  readonly href: string;
}

/** Find all allowlisted matches (internal paths + exact contact hrefs), sorted
 * by position, with overlaps resolved by preferring the earlier/longer match. */
function findMatches(text: string): readonly Match[] {
  const raw: Match[] = [];

  for (const m of text.matchAll(INTERNAL_PATH_RE)) {
    if (m.index === undefined) continue;
    raw.push({ start: m.index, end: m.index + m[0].length, href: m[0] });
  }

  const contactRe = buildContactRe();
  if (contactRe) {
    for (const m of text.matchAll(contactRe)) {
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
