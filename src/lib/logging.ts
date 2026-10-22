/**
 * logging — what an API route is allowed to write to the platform log.
 *
 * Worker logs are retained with `observability.enabled` in wrangler.jsonc, so a
 * whole caught error is not a safe log argument: an AI-SDK `APICallError` or an
 * Upstash failure serializes the upstream URL, request headers (API keys
 * included) and response body into that store. Only the message goes in.
 */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown";
}

/** Cap on a logged `ip` field's length — 45 chars covers the longest real
 * IPv6 textual form; a header spoofed with more than that is truncated rather
 * than trusted verbatim into a log line. */
export const MAX_LOGGED_IP_CHARS = 45;

/** Truncate an ip for logging. Pure. */
export function truncateIpForLog(ip: string): string {
  return ip.length > MAX_LOGGED_IP_CHARS ? ip.slice(0, MAX_LOGGED_IP_CHARS) : ip;
}
