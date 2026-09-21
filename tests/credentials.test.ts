import { describe, expect, it } from "vitest";
import { credentialById, credentials } from "../content/credentials";
import { allLicenseTests, licenses } from "../content/licenses";
import { caseStudyBySlug } from "../content/gtme";

/**
 * Credentials are the one content type that makes a claim a reader is
 * invited to check against a third party, so the redlines here are about
 * the link staying honest: https only, an issuer-hosted verification page,
 * and no field left blank on a plate that renders it.
 */
describe("credentials", () => {
  it("has unique ids", () => {
    const ids = credentials.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("resolves every credential through credentialById", () => {
    for (const c of credentials) {
      expect(credentialById.get(c.id)).toBe(c);
    }
  });

  it("gives every credential a non-empty value in every field", () => {
    for (const c of credentials) {
      for (const [key, value] of Object.entries(c)) {
        expect(value, `${c.id}.${key}`).toBeTruthy();
      }
    }
  });

  it("verifies over https", () => {
    for (const c of credentials) {
      expect(c.href.startsWith("https://"), `${c.id} → ${c.href}`).toBe(true);
    }
  });

  it("uses no dash characters the gtme voice lint forbids", () => {
    // Credentials are attached to the specialStage export, so every string
    // here is walked by tests/gtme-content.test.ts. Fail here first, with a
    // message that names the field, rather than in the voice suite.
    for (const c of credentials) {
      for (const [key, value] of Object.entries(c)) {
        for (const dash of ["—", "–", "―"]) {
          expect(value.includes(dash), `${c.id}.${key} contains "${dash}"`).toBe(
            false,
          );
        }
      }
    }
  });
});

describe("license evidence — special stage cross-links", () => {
  it("resolves every specialStageSlug to a real case study", () => {
    for (const t of allLicenseTests) {
      if (t.specialStageSlug) {
        expect(
          caseStudyBySlug.has(t.specialStageSlug),
          `${t.id} → ${t.specialStageSlug}`,
        ).toBe(true);
      }
    }
  });

  it("resolves every tier credentialId to a real credential", () => {
    for (const l of licenses) {
      if (l.credentialId) {
        expect(
          credentialById.has(l.credentialId),
          `${l.id} → ${l.credentialId}`,
        ).toBe(true);
      }
    }
  });
});
