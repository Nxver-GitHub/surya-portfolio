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
