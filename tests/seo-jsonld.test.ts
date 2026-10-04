import { describe, expect, it } from "vitest";
import { cars, carPath, detailCars } from "../content/cars";
import { credentials } from "../content/credentials";
import { emailAddress } from "../content/lobby";
import {
  PERSON_ALTERNATE_NAMES,
  PERSON_PROFILES,
  SITE_DESCRIPTION,
  SITE_TITLE,
} from "../src/lib/identity";
import {
  breadcrumbJsonLd,
  personDetailJsonLd,
  personJsonLd,
  projectJsonLd,
  serializeJsonLd,
  siteGraphJsonLd,
} from "../src/lib/jsonld";
import { projectLede } from "../src/lib/project-lede";
import { SITE_URL } from "../src/lib/site";

describe("site identity", () => {
  it("leads with the durable role, never a current employer", () => {
    expect(SITE_TITLE).toContain("Surya Pugazhenthi");
    expect(SITE_TITLE).toContain("Product Builder");
    expect(SITE_TITLE).not.toMatch(/16VC/);
    expect(SITE_DESCRIPTION).not.toMatch(/16VC/);
  });

  it("uses only the owner-approved alternate names", () => {
    expect([...PERSON_ALTERNATE_NAMES]).toEqual(["Surya Pugaz", "suryapugaz", "Surya P.", "Surya P"]);
    expect(PERSON_ALTERNATE_NAMES.join(" ")).not.toMatch(/nxver/i);
  });

  it("links GitHub, LinkedIn and X as profiles", () => {
    expect(PERSON_PROFILES).toHaveLength(3);
    expect(PERSON_PROFILES.every((href) => href.startsWith("https://"))).toBe(true);
  });
});

describe("Person JSON-LD", () => {
  const person = personJsonLd() as Record<string, unknown>;
  const json = JSON.stringify([siteGraphJsonLd(), personDetailJsonLd()]);

  it("keeps the site-wide Person to what every page shows", () => {
    expect(person.hasCredential).toBeUndefined();
    expect(person.description).toBeUndefined();
    expect((personDetailJsonLd() as Record<string, unknown>)["@id"]).toBe(person["@id"]);
  });

  it("states no employer", () => {
    expect(person.worksFor).toBeUndefined();
    expect(person.jobTitle).toBe("Product Builder");
  });

  it("carries the UCSC degree and every verified credential", () => {
    expect(json).toContain("Baskin School of Engineering");
    for (const c of credentials) {
      expect(json).toContain(c.href);
      expect(json).toContain(c.credentialId);
    }
  });

  it("never leaks the email address or an API route", () => {
    expect(json).not.toContain(emailAddress.user);
    expect(json).not.toContain("/api/");
  });
});

describe("BreadcrumbList", () => {
  it("roots at the World Map with absolute, ordered items", () => {
    const crumbs = breadcrumbJsonLd([
      { name: "Garage", path: "/garage" },
      { name: "Nodegent", path: "/garage/nodegent" },
    ]) as { itemListElement: { position: number; item: string; name: string }[] };
    expect(crumbs.itemListElement.map((i) => i.position)).toEqual([1, 2, 3]);
    expect(crumbs.itemListElement[0]).toMatchObject({ name: "World Map", item: SITE_URL });
    expect(crumbs.itemListElement[2].item).toBe(`${SITE_URL}/garage/nodegent`);
  });
});

describe("project pages", () => {
  it("exist for hero and silhouette cars only", () => {
    const ids = detailCars.map((c) => c.id);
    expect(ids).toHaveLength(8);
    expect(ids).not.toContain("stealth");
    for (const car of cars.filter((c) => c.status !== "locked")) {
      expect(ids).toContain(car.id);
    }
  });

  it("describe each project with its own URL and the owner as creator", () => {
    for (const car of detailCars) {
      const ld = projectJsonLd(car) as Record<string, unknown>;
      expect(ld.url).toBe(`${SITE_URL}${carPath(car.id)}`);
      expect(ld.name).toBe(car.name);
      expect(ld.creativeWorkStatus).toBe(car.status === "hero" ? "Published" : "In development");
    }
  });

  it("lead with a plain-English summary built from rendered fields", () => {
    const nodegent = detailCars.find((c) => c.id === "nodegent")!;
    const lede = projectLede(nodegent);
    expect(lede.startsWith(nodegent.tagline!)).toBe(true);
    expect(lede).toContain("Built by Surya Pugazhenthi (Product Owner & Lead Developer), Spring 2026.");
    expect(lede).toContain("Result: Live at nodegent.app");
  });
});

describe("serializeJsonLd", () => {
  it("cannot close the script element", () => {
    expect(serializeJsonLd({ name: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
});
