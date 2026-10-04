/**
 * agent-visitor — is this page being driven by software rather than a person?
 *
 * Browser-driving assistants (computer-use agents, personal assistants,
 * headless crawlers that execute JS) should land on content, not on the
 * once-per-session boot intro and PRESS START gate, which exist for people.
 * Two signals, either suffices:
 *   - `navigator.webdriver`, set by WebDriver/CDP automation (Playwright,
 *     Puppeteer, Selenium) per the WebDriver spec;
 *   - a user agent naming a known bot or AI agent.
 * A false negative just means the agent sees the intro and its Skip button,
 * which is exactly today's behaviour. Pure.
 */
// `\bbot\b|bot\/` rather than a bare `bot`: crawler UAs read "GPTBot/1.2",
// "Googlebot/2.1", while real phones can carry the letters ("Cubot X30").
const AGENT_UA =
  /\bbot\b|bot\/|crawler|spider|headless|GPTBot|ChatGPT|OAI-SearchBot|Claude|Anthropic|Perplexity|Google-Extended|Bytespider|Amazonbot|Applebot|meta-external|DuckAssist|Grok|xAI/i;

export interface VisitorSignals {
  readonly webdriver?: boolean;
  readonly userAgent?: string;
}

export function isAutomatedVisitor({ webdriver, userAgent }: VisitorSignals): boolean {
  return webdriver === true || (userAgent !== undefined && AGENT_UA.test(userAgent));
}
