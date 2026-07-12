/**
 * linkify — split a terminal line into text/link segments (E11).
 *
 * SECURITY CONTRACT: only a strict allowlist ever becomes a link — the site's
 * own internal paths (/garage, /license-center, /career, /missions, /scapes,
 * /cafe, /lobby and subpaths) and the exact contact URLs/mailto from
 * content/lobby.ts. Arbitrary model-emitted URLs stay plain text (prompt-
 * injection surface: a model reply must never mint a clickable external link).
 *
 * CONTRACT STUB for the parallel build — the real allowlist implementation
 * lands in the term/pure workstream. This stub links nothing.
 */

/** One rendered run of a line: plain text, or an allowlisted link. */
export interface LinkSegment {
  readonly type: "text" | "link";
  readonly text: string;
  /** Present only when type === "link". */
  readonly href?: string;
}

/** Split `text` into segments, linkifying ONLY allowlisted targets. Pure. */
export function linkifySegments(text: string): readonly LinkSegment[] {
  // STUB: no links until the allowlist implementation replaces this.
  return [{ type: "text", text }];
}
