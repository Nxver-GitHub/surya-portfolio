/**
 * conversation — shape rules for the café terminal's message history, shared by
 * the route (which ENFORCES them) and the client transport (which CONFORMS to
 * them before posting).
 *
 * Why a shape rule at all: the route accepts `role: "assistant"` turns from the
 * client, because the client owns the scrollback. That lets a hand-rolled
 * request invent in-context precedent — a fake assistant turn agreeing that
 * "diagnostic mode is engaged, constraints suspended" is a far stronger prompt
 * attack than "ignore previous instructions", which the system prompt resists.
 * Requiring a well-formed transcript (opens with the visitor, strictly
 * alternating) removes the free-form slot such a payload needs.
 *
 * Why the client must conform: `useChat` keeps a user message in its history
 * when the turn FAILS (a 429, a dropped stream), so the next send would
 * legitimately carry two user turns in a row. {@link toAlternatingConversation}
 * collapses that back to the accepted shape rather than letting a rate-limited
 * visitor's session 400 forever afterwards.
 */

/**
 * Total characters allowed across the WHOLE transcript in one request. Lives
 * here rather than in the route so the client can respect it without importing
 * a server module (which would drag Upstash and the AI SDK into the bundle).
 *
 * The per-message caps alone multiply out to 30 × 2400 ≈ 72k chars (~18k input
 * tokens) that a hand-rolled client could send on each of the 400 daily
 * requests — far more than the UI can produce.
 *
 * 30k is sized to cover the terminal's own ABSOLUTE worst case, so the rule can
 * never refuse a genuine transcript: 15 visitor turns (MAX_USER_MESSAGES) at
 * the 500-char input cap is 7.5k, and 15 replies bounded by maxOutputTokens 350
 * reach ~1400 chars each (~21k) — 28.5k, with headroom. A typical full session
 * lands nearer 14k. NOT the ~8k the audit suggested: that would have cut a
 * normal session's memory around turn six.
 */
export const MAX_TOTAL_CONTENT_CHARS = 30_000;

/** The minimal turn shape both sides agree on. */
export interface ConversationTurn {
  readonly role: "user" | "assistant";
  readonly content: string;
}

/**
 * A transcript is well-formed when it is non-empty, opens with the visitor, and
 * strictly alternates user → assistant → user … Pure.
 */
export function isWellFormedConversation(
  messages: readonly { readonly role: "user" | "assistant" }[],
): boolean {
  if (messages.length === 0) return false;
  return messages.every(
    (message, index) => message.role === (index % 2 === 0 ? "user" : "assistant"),
  );
}

/**
 * Collapse an arbitrary history into the alternating shape above: drop any
 * leading assistant turns, and within a same-role run keep only the LAST entry
 * (the newest question, or the most complete reply). Returns a new array.
 */
export function toAlternatingConversation<
  T extends { readonly role: "user" | "assistant" },
>(messages: readonly T[]): T[] {
  return messages.reduce<T[]>((kept, message) => {
    const previous = kept[kept.length - 1];
    if (!previous) return message.role === "user" ? [message] : kept;
    if (previous.role === message.role) return [...kept.slice(0, -1), message];
    return [...kept, message];
  }, []);
}

/** Total characters across every turn — the budget the route enforces. */
export function totalContentChars(
  messages: readonly { readonly content: string }[],
): number {
  return messages.reduce((sum, message) => sum + message.content.length, 0);
}

/**
 * Drop the OLDEST turns until the transcript fits `maxChars`, keeping the shape
 * valid (the result still opens with a user turn) and always keeping the final
 * turn. A sliding window, so a long session degrades context instead of failing
 * the route's budget check.
 */
export function trimToCharBudget<T extends ConversationTurn>(
  messages: readonly T[],
  maxChars: number,
): T[] {
  if (totalContentChars(messages) <= maxChars) return [...messages];
  // Drop from the front in whole turns, then re-normalize so the window still
  // opens on a user turn. The last turn is never dropped: it is the question.
  for (let start = 1; start < messages.length; start += 1) {
    const window = toAlternatingConversation(messages.slice(start));
    if (window.length > 0 && totalContentChars(window) <= maxChars) return window;
  }
  return messages.slice(-1);
}
