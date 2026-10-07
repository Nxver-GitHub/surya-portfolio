import { describe, expect, it } from "vitest";
import { findEvent, seasons, type CareerEvent } from "../content/career";
import { careerLede } from "../src/lib/career-lede";
import { markdownForPath } from "../src/lib/agent-docs/pages";
import { llmsFullTxt } from "../src/lib/agent-docs/llms";

const events: readonly CareerEvent[] = seasons.flatMap((s) => s.events.filter((e) => !e.locked));

describe("career page ledes", () => {
  it.each(events.map((e) => [e.slug, e] as const))("%s leads with who, when and the result", (_slug, event) => {
    const lede = careerLede(event);
    expect(lede.startsWith("Surya Pugazhenthi ")).toBe(true);
    expect(lede).toContain(event.dates);
    expect(lede).toContain(`Result: ${event.result}`);
    expect(lede.endsWith(".")).toBe(true);
  });

  it("never doubles brackets when the org already ends in one", () => {
    for (const e of events) expect(careerLede(e)).not.toMatch(/\) \(/);
    expect(careerLede(findEvent("lvlup-ventures")!.event)).toContain(
      "at LvlUp Ventures (Shopline-backed seed fund), Feb 2026 – Present.",
    );
  });

  it("uses the present tense only for stints still running", () => {
    for (const e of events.filter((x) => !x.lede)) {
      const current = /present/i.test(e.dates);
      expect(careerLede(e)).toContain(current ? " serves as " : " served as ");
    }
  });

  it("overrides restate the page's dates and never the generated employment phrasing", () => {
    const overridden = events.filter((e) => e.lede);
    expect(overridden.map((e) => e.slug).sort()).toEqual(
      ["benefitfinder-cruzhacks", "credence-ef-hackathon", "slugspace", "tripweaver-locus"],
    );
    for (const e of overridden) {
      expect(e.lede).toContain(e.dates);
      expect(e.lede).not.toMatch(/served as/);
    }
  });

  it("matches the approved wording for the flagged page", () => {
    expect(careerLede(findEvent("code-for-your-future")!.event)).toBe(
      "Surya Pugazhenthi served as VP of Growth & Strategy at Code for Your Future, DVC (Aug – Dec 2023). Result: Shaped long-term vision and prepared members for CS exams, internships, and interviews.",
    );
  });

  it("records slugspace as a GDG team project, not independent", () => {
    const { event } = findEvent("slugspace")!;
    expect(event.org).toBe("Google Developer Groups on Campus, UCSC");
    expect(careerLede(event)).toContain("Google Developer Groups on Campus team");
    expect(JSON.stringify(seasons)).not.toContain("Independent, UCSC");
  });

  it("reaches the markdown twin and llms-full.txt", () => {
    for (const e of events) {
      const md = markdownForPath(`/career/${e.slug}`)!;
      expect(md.split("\n\n")[1]).toBe(careerLede(e));
    }
    expect(llmsFullTxt()).toContain(careerLede(findEvent("16vc")!.event));
  });
});
