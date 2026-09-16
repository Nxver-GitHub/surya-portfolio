/**
 * transcriptSignature — proof that an assistant turn in a submitted transcript
 * is one this server actually produced.
 *
 * THE ATTACK. /api/cafe-terminal accepts `role: "assistant"` turns because the
 * client owns the scrollback. A hand-rolled request can therefore fabricate
 * in-context precedent — an "assistant" turn that says diagnostic mode is
 * engaged and the house rules are suspended, followed by a user turn cashing
 * that in. Fabricated precedent is materially stronger than "ignore previous
 * instructions", because it does not ask the model to break a rule; it presents
 * a past in which the rule was already lifted. The alternating-shape rule in
 * lib/conversation.ts does NOT stop this: a forged turn alternates perfectly.
 *
 * THE FIX. Every reply the route streams is accompanied by an HMAC-SHA256 over
 * its canonical text ({@link normalizeAssistantContent}). The client echoes
 * content + signature on the next turn; {@link verifiedTranscript} recomputes
 * the HMAC and keeps only the assistant turns that match. Stateless, so it
 * works on Workers with no store and no session affinity.
 *
 * KEY SEPARATION. The key is DERIVED from `ADMIN_SESSION_SECRET` rather than
 * being that secret: `HMAC(ADMIN_SESSION_SECRET, TURN_KEY_CONTEXT)`. These tags
 * are handed to every anonymous visitor, so signing with the admin-session key
 * itself would turn a public endpoint into a chosen-message MAC oracle under
 * the key that mints admin cookies. Domain-separated derivation keeps the two
 * uses independent — a tag from here says nothing about an admin token — while
 * requiring the owner to provision NO new secret.
 *
 * DEGRADED MODE. With no `ADMIN_SESSION_SECRET` set there is no key, so no
 * signatures are issued and no assistant turn can be verified: the transcript
 * falls back to the visitor's own questions. The terminal keeps working with
 * less memory. Fail-closed, never fail-open.
 *
 * KNOWN LIMIT. A signature binds content, not position: a visitor can replay a
 * reply the server genuinely produced into a different slot. That reorders real
 * output; it cannot manufacture text the model never wrote, which is the whole
 * point of the check.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import type { ConversationTurn } from "@/lib/conversation";

/** Domain separator for the derived key. Bump the version if the signed form
 * of a turn ever changes — old signatures then stop verifying by construction
 * rather than silently covering different bytes. */
const TURN_KEY_CONTEXT = "surya-portfolio/cafe-terminal/assistant-turn/v1";

/** Hex SHA-256 HMAC — the only signature shape accepted over the wire. */
export const TURN_SIGNATURE_PATTERN = /^[0-9a-f]{64}$/;

/**
 * Derive the turn-signing key from the admin session secret. Returns null when
 * the secret is absent, which is the signal for degraded mode above. Cheap
 * enough (one HMAC) to call per request; no cache needed.
 */
export function deriveTurnSigningKey(
  secret: string | undefined | null,
): Buffer | null {
  if (!secret) return null;
  return createHmac("sha256", secret).update(TURN_KEY_CONTEXT).digest();
}

/** Sign one canonical assistant turn. The caller MUST pass the normalized form
 * — the signature covers exactly the bytes the client will echo back. */
export function signAssistantTurn(content: string, key: Buffer): string {
  return createHmac("sha256", key).update(content).digest("hex");
}

/**
 * Verify a presented signature against the content it claims to cover.
 * Constant-time, and never throws on a malformed or absent signature.
 */
export function verifyAssistantTurn(
  content: string,
  signature: string | undefined | null,
  key: Buffer,
): boolean {
  if (!signature || !TURN_SIGNATURE_PATTERN.test(signature)) return false;
  const expected = Buffer.from(signAssistantTurn(content, key), "hex");
  const presented = Buffer.from(signature, "hex");
  if (expected.length !== presented.length) return false;
  return timingSafeEqual(expected, presented);
}

/**
 * Reduce a submitted transcript to the turns the model may be shown: every user
 * turn (the visitor's own words — always theirs to send), plus only those
 * assistant turns carrying a valid signature.
 *
 * Unverified assistant turns are DROPPED, not rejected with a 400. Both stop
 * the attack — forged precedent never reaches the model either way — but
 * dropping cannot strand a legitimate visitor whose scrollback predates signing
 * or was reshaped by the client's trimming: they lose context, not the session.
 * The surviving turns can sit user-after-user; the model accepts that, and it
 * is strictly more faithful than collapsing the visitor's real questions.
 */
export function verifiedTranscript<T extends ConversationTurn>(
  messages: readonly T[],
  key: Buffer | null,
): T[] {
  return messages.filter(
    (message) =>
      message.role === "user" ||
      (key !== null && verifyAssistantTurn(message.content, message.signature, key)),
  );
}
