export interface NumeralPart {
  readonly text: string;
  /** True for a number run that should be set in the numeric face. */
  readonly numeric: boolean;
}

/**
 * A standalone number: digits plus the separators that belong inside one —
 * thousands commas, decimal points, times, fractions, percent, sign and a
 * dash between two digits ("2024–2025"). A digit glued to a letter on either
 * side is a short code (SS1, 01A, S3, 4K), not a number, and is left alone —
 * except a version's "v" (v1.9), which prefixes a number rather than a code.
 */
// The run is captured in a lookahead and re-matched by backreference — JS's
// stand-in for an atomic group — so a number glued to a letter ("1.5x", "2-3x")
// is rejected whole instead of backtracking to a shorter numeric prefix.
const NUMBER = /(?<![A-Za-uw-z\d.,])(?=([+]?\d(?:[\d,.:/%]|[–-](?=\d))*))\1(?![A-Za-z\d])/g;

/** Splits text into alternating lettering and number runs, in order. */
export function splitNumerals(text: string): readonly NumeralPart[] {
  const parts: NumeralPart[] = [];
  let last = 0;
  for (const match of text.matchAll(NUMBER)) {
    const start = match.index ?? 0;
    // Trailing punctuation ends a sentence, not a number: "in 2024." or "3,".
    const run = match[0].replace(/[,.:/]+$/, "");
    if (start > last) parts.push({ text: text.slice(last, start), numeric: false });
    parts.push({ text: run, numeric: true });
    last = start + run.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), numeric: false });
  return parts.length ? parts : [{ text, numeric: false }];
}
