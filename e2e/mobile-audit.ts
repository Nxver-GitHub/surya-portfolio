import type { Page } from "@playwright/test";

/**
 * In-page layout audits for the mobile gate (mobile-layout.spec.ts). Each one
 * runs inside the browser and returns plain, human-readable offender strings,
 * so a failure names the exact element instead of a count.
 */

/** WCAG 2.5.8 (Target Size, Minimum) — AA floor in CSS px. */
export const MIN_TARGET_PX = 24;
/** Project rule: nothing below 12px. */
export const MIN_TEXT_PX = 12;

/** Every public route the mobile gate walks. */
export const MOBILE_ROUTES = [
  "/",
  "/career",
  "/career/16vc",
  "/garage",
  "/garage/nodegent",
  "/license-center",
  "/missions",
  "/special-stage",
  "/special-stage/reason-codes",
  "/scapes",
  "/cafe",
  "/lobby",
] as const;

/** Pixels of horizontal overflow, 0 when the page fits its viewport. */
export async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const root = document.documentElement;
    return Math.max(0, root.scrollWidth - root.clientWidth);
  });
}

/**
 * Visible interactive elements smaller than 24×24 CSS px.
 *
 * The one exemption is WCAG's own "inline" exception: a link inside a sentence
 * of prose, whose size is set by the line-height of the text around it. That
 * is detected structurally (an inline `<a>` whose block parent carries other
 * text), never by listing selectors, so a new undersized chip cannot hide in it.
 */
export async function undersizedTargets(page: Page, min = MIN_TARGET_PX): Promise<string[]> {
  return page.evaluate((minPx) => {
    const selector = [
      "a[href]",
      "button",
      "input:not([type=hidden])",
      "select",
      "textarea",
      "summary",
      "[role=button]",
      "[role=tab]",
      "[role=link]",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");

    const isVisible = (el: Element): boolean => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.opacity === "0") return false;
      if (el.closest("[aria-hidden='true'], [inert]")) return false;
      return true;
    };

    const isInlineProseLink = (el: Element): boolean => {
      if (el.tagName !== "A") return false;
      if (!getComputedStyle(el).display.startsWith("inline")) return false;
      const block = el.closest("p, li, dd, td, figcaption, blockquote");
      if (!block) return false;
      const own = (el.textContent ?? "").trim().length;
      const all = (block.textContent ?? "").trim().length;
      // A sentence, not a caption: at least a short clause of other text.
      return all - own >= 30;
    };

    const label = (el: Element): string => {
      const text = (el.getAttribute("aria-label") ?? el.textContent ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 40);
      const cls = (el.getAttribute("class") ?? "").split(/\s+/).slice(0, 3).join(".");
      return `<${el.tagName.toLowerCase()}${cls ? "." + cls : ""}> "${text}"`;
    };

    // The "stretched link" card pattern: an absolutely positioned ::after on
    // the link covers its positioned card, so the card is the real hit area.
    const hitRect = (el: Element): DOMRect => {
      const after = getComputedStyle(el, "::after");
      if (after.content !== "none" && after.position === "absolute") {
        const card = (el as HTMLElement).offsetParent;
        if (card) return card.getBoundingClientRect();
      }
      return el.getBoundingClientRect();
    };

    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll(selector))) {
      if (!isVisible(el) || isInlineProseLink(el)) continue;
      const { width, height } = hitRect(el);
      // Half a pixel of rounding slack: layout can land on 23.99.
      if (width + 0.5 < minPx || height + 0.5 < minPx) {
        out.push(`${label(el)} ${width.toFixed(1)}×${height.toFixed(1)}`);
      }
    }
    return out;
  }, min);
}

/**
 * Visible text rendered below the 12px floor. Screen-reader-only and
 * `aria-hidden` decoration are skipped: neither is read off the screen.
 */
export async function undersizedText(page: Page, min = MIN_TEXT_PX): Promise<string[]> {
  return page.evaluate((minPx) => {
    const isSrOnly = (el: Element): boolean => {
      for (let node: Element | null = el; node; node = node.parentElement) {
        if (node.classList.contains("sr-only")) return true;
        const s = getComputedStyle(node);
        if (s.position === "absolute" && s.clip === "rect(0px, 0px, 0px, 0px)") return true;
      }
      return false;
    };

    const seen = new Set<Element>();
    const out: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = (node.textContent ?? "").trim();
      const el = node.parentElement;
      if (!text || !el || seen.has(el)) continue;
      seen.add(el);
      if (el.closest("script, style, noscript, [aria-hidden='true'], [inert]")) continue;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (isSrOnly(el)) continue;
      const size = parseFloat(style.fontSize);
      // font-size: 0 is the replaced-text idiom (a ::after carries the copy).
      if (size === 0) continue;
      if (size + 0.05 < minPx) {
        out.push(`${size}px "${text.replace(/\s+/g, " ").slice(0, 40)}" in <${el.tagName.toLowerCase()}>`);
      }
    }
    return out;
  }, min);
}

/**
 * Scrolls to the very end of the page and reports any in-flow text the fixed
 * Sound Select bar still covers. Body reserves the bar's height as padding;
 * this proves no route opts out of that reserve (a fixed-height shell, a
 * 100dvh screen) and hides its last line under the deck.
 */
export async function textUnderSoundBar(page: Page): Promise<string[]> {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(150);
  return page.evaluate(() => {
    const bar = document.querySelector(".sound-bar");
    if (!bar || getComputedStyle(bar).display === "none") return [];
    const top = bar.getBoundingClientRect().top;
    const inFixed = (el: Element): boolean => {
      for (let node: Element | null = el; node; node = node.parentElement) {
        const pos = getComputedStyle(node).position;
        if (pos === "fixed" || pos === "sticky") return true;
      }
      return false;
    };
    const out: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = (node.textContent ?? "").trim();
      const el = node.parentElement;
      if (!text || !el || bar.contains(el) || el.closest("[aria-hidden='true'], .sr-only")) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || rect.top >= window.innerHeight) continue;
      if (rect.bottom > top + 1 && !inFixed(el)) {
        out.push(`"${text.replace(/\s+/g, " ").slice(0, 40)}" bottom ${rect.bottom.toFixed(0)} > bar ${top.toFixed(0)}`);
      }
    }
    return out;
  });
}
