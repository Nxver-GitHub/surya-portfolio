/**
 * respond — the HTTP shape shared by every agent-facing text document.
 */

export type AgentDocType = "text/plain" | "text/markdown";

/**
 * A text response for crawlers and agents. `canonical`, when given, points the
 * markdown twin back at its HTML page so search engines consolidate the two
 * instead of indexing a duplicate.
 */
export function agentDocResponse(
  body: string,
  type: AgentDocType,
  canonical?: string,
): Response {
  const headers: Record<string, string> = {
    "Content-Type": `${type}; charset=utf-8`,
    "Cache-Control": "public, max-age=3600",
  };
  if (canonical) headers.Link = `<${canonical}>; rel="canonical"`;
  return new Response(`${body}\n`, { headers });
}
