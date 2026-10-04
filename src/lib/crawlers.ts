/**
 * AI crawler user-agent tokens the site explicitly welcomes (robots.ts).
 * Owner decision 2026-10-03: allow live-answer agents AND training crawlers.
 */
export const AI_CRAWLERS = [
  // Live answers and citations
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "DuckAssistBot",
  // Model training
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Meta-ExternalAgent",
  "Bytespider",
  "Amazonbot",
] as const;
