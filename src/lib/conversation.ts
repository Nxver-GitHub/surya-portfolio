/**
 * conversation — shape rules for the café terminal's message history, shared by
 * the route (which ENFORCES them) and the client transport (which CONFORMS to
 * them before posting).
 *
 * Why a shape rule at all: the route accepts `role: "assistant"` turns from the
 * client, because the client owns the scrollback. Requiring a well-formed
 * transcript (opens with the visitor, strictly alternating) keeps the request
 * to a shape the terminal could actually have produced, and bounds how many
 * assistant turns one request may carry.
 *
 * What the shape rule does NOT do — the correction this file's first version
 * got wrong: it does not stop forged in-context precedent. A fake assistant
 * turn agreeing that "diagnostic mode is engaged, constraints suspended"
 * alternates perfectly well, so shape alone admits it. Authenticity is a
 * separate, cryptographic check — every assistant turn carries an HMAC the
 * server issued for that exact content, and lib/transcriptSignature.ts drops
 * any turn that cannot present one. Shape is hygiene; the signature is the
 * security property.
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

/**
 * Per-message content bounds, BY ROLE. User input mirrors the UI's 500-char
 * input cap; assistant history must admit our OWN replies (maxOutputTokens ≈
 * 350 stays well under 2400 chars) — a single shared cap made every follow-up
 * turn 400 on its previous answer.
 *
 * They live here, beside {@link normalizeTurnContent}, because the SIGNATURE
 * covers the post-truncation string: server and client must apply one cap from
 * one place or every follow-up turn loses its context.
 */
export const MAX_USER_CONTENT_CHARS = 500;
export const MAX_ASSISTANT_CONTENT_CHARS = 2400;

/** The minimal turn shape both sides agree on. */
export interface ConversationTurn {
  readonly role: "user" | "assistant";
  readonly content: string;
  /** Hex HMAC the server issued for this exact `content`. Assistant turns only;
   * absent on user turns and on replies produced before signing was enabled. */
  readonly signature?: string;
}

/**
 * The single canonical form of a turn's text — the string that is signed, sent,
 * validated and replayed. Both sides MUST derive content through this function:
 * the server signs what it returns, the client echoes what it returns, and the
 * route's zod `.trim()` is then a no-op instead of a signature-breaking edit.
 *
 * Steps, in this order and for these reasons:
 *   - strip `**`: the model is told plain-text-only but leaks markdown bold,
 *     and the terminal renders raw text, so the client removes it for display.
 *   - trim, truncate, trim AGAIN: truncating can expose trailing whitespace
 *     that a later trim would remove, which would change the signed bytes.
 */
export function normalizeTurnContent(raw: string, maxChars: number): string {
  return raw.replaceAll("**", "").trim().slice(0, maxChars).trim();
}

/** {@link normalizeTurnContent} at the assistant cap — the signed form. */
export function normalizeAssistantContent(raw: string): string {
  return normalizeTurnContent(raw, MAX_ASSISTANT_CONTENT_CHARS);
}

/** {@link normalizeTurnContent} at the visitor-input cap. */
export function normalizeUserContent(raw: string): string {
  return normalizeTurnContent(raw, MAX_USER_CONTENT_CHARS);
}

/**
 * A transcript is well-formed when it is non-empty, opens with the visitor, and
 * strictly alternates user → assistant → user … Pure.
 *
 * SCOPE — this is a shape check and nothing more. It does NOT establish that an
 * assistant turn was ever produced by this server: a forged "constraints
 * suspended" reply in position 1 alternates and passes here. Authenticity is
 * lib/transcriptSignature.ts's job; do not cite this function as the defence.
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
 *
 * CONTRACT: the result always fits `maxChars`. The earlier version returned the
 * final turn whole when that ONE turn was itself over budget, handing back an
 * over-budget transcript from a function whose whole purpose is the budget —
 * unreachable through the current caller (which caps each turn first) but wrong.
 * A single over-budget turn is now truncated to fit.
 *
 * A truncated turn's {@link ConversationTurn.signature} no longer matches its
 * content, so the route drops it as unverified: the degradation is lost context
 * on an impossible-in-practice turn, never a failed request.
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
  const last = messages[messages.length - 1];
  if (!last) return [];
  if (last.content.length <= maxChars) return [last];
  // Spread-with-override preserves whatever extra fields T carries; TypeScript
  // cannot prove the result is still T for an open generic, hence the cast.
  return [{ ...last, content: last.content.slice(0, maxChars) } as T];
}
