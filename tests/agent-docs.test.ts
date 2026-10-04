import { describe, expect, it } from "vitest";
import { allEventSlugs } from "../content/career";
import { carPath, detailCars } from "../content/cars";
import { emailAddress } from "../content/lobby";
import { stageOrder } from "../content/gtme";
import { llmsFullTxt, llmsTxt } from "../src/lib/agent-docs/llms";
import { markdownForPath, markdownPagePaths, markdownPath } from "../src/lib/agent-docs/pages";
import { KNOWN_ROUTES } from "../src/lib/routes";
import { SITE_URL } from "../src/lib/site";

const ALL_DOCS = (): string[] => [
  llmsTxt(),
  llmsFullTxt(),
  ...markdownPagePaths().map((p) => markdownForPath(p) ?? ""),
];

describe("markdown alternates", () => {
  it("exist for every sitemap page", () => {
    const paths = markdownPagePaths();
    for (const route of KNOWN_ROUTES) expect(paths).toContain(route);
    for (const slug of allEventSlugs) expect(paths).toContain(`/career/${slug}`);
    for (const car of detailCars) expect(paths).toContain(carPath(car.id));
    for (const slug of stageOrder) expect(paths).toContain(`/special-stage/${slug}`);
    for (const path of paths) {
      const doc = markdownForPath(path);
      expect(doc, path).toBeTruthy();
      expect(doc!.startsWith("# "), path).toBe(true);
    }
  });

  it("map the home page to /index.md and others to <path>.md", () => {
    expect(markdownPath("/")).toBe("/index.md");
    expect(markdownPath("/garage/nodegent")).toBe("/garage/nodegent.md");
  });

  it("have no document for the locked project or unknown paths", () => {
    expect(markdownForPath("/garage/stealth")).toBeNull();
    expect(markdownForPath("/garage/nope")).toBeNull();
    expect(markdownForPath("/career/project-silhouette")).toBeNull();
    expect(markdownForPath("/api/beacon")).toBeNull();
    expect(markdownForPath("/garage/nodegent/extra")).toBeNull();
  });
});

describe("llms.txt", () => {
  const txt = llmsTxt();

  it("follows the llmstxt.org shape: H1, summary quote, sections", () => {
    expect(txt.startsWith("# Surya Pugazhenthi\n\n> ")).toBe(true);
    expect(txt).toContain("## Projects");
    expect(txt).toContain("## Optional");
  });

  it("lists every project page and the full-text file", () => {
    for (const car of detailCars) expect(txt).toContain(`${SITE_URL}${carPath(car.id)}`);
    expect(txt).toContain(`${SITE_URL}/llms-full.txt`);
  });

  it("explains the racing labels and how to cite", () => {
    expect(txt).toMatch(/Garage = projects/);
    expect(txt).toMatch(/When citing/);
  });
});

describe("agent documents never expose", () => {
  it("the email address, API routes, or the locked project", () => {
    for (const doc of ALL_DOCS()) {
      expect(doc).not.toContain(emailAddress.user);
      expect(doc).not.toContain("/api/");
      expect(doc).not.toContain("/garage/stealth");
      expect(doc).not.toContain("Project Silhouette");
    }
  });
});
