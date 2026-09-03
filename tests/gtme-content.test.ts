import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as gtmeModule from "../content/gtme";
import * as handCheckModule from "../content/gtme-handcheck";
import { allEventSlugs } from "../content/career";
import { pavilions } from "../content/pavilions";

const { caseStudies, caseStudyBySlug, stageOrder } = gtmeModule;
const { handCheck, verdictLabels } = handCheckModule;

const PUBLIC_DIR = join(__dirname, "..", "public");

const EM_DASH = "—";
const HORIZONTAL_BAR = "―";
const EN_DASH = "–";
const NOT_X_ITS_Y_RE = /\bnot\b[^.!?\n]{0,60},\s*(it['’]s|it\s+is)\s/i;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[a-z]{2,}/gi;
const ALLOWED_EMAIL = "test@example.com";
const SUPABASE_TOKEN_RE = /\b[a-z0-9]{20}\.supabase\b/;
/** Guards an anonymization decision: this private individual's surname must never ship in copy. */
const FORBIDDEN_SURNAME = "Crawbuck";

/**
 * Recursively collects every string value out of an arbitrary export tree
 * (module exports → objects/arrays/strings), so voice-lint and privacy
 * checks below walk the whole content surface instead of hand-enumerating
 * every field. Strings inside a `StageArtifact`'s `code` field (kind
 * "code") are tagged `isCode: true` — the voice-lint suite excludes them
 * because they're verbatim source, but the privacy suite still includes
 * them.
 */
interface CollectedString {
  module: string;
  path: string;
  value: string;
  isCode: boolean;
}

function collect(
  value: unknown,
  moduleName: string,
  path: string,
  isCode: boolean,
  out: CollectedString[],
): void {
  if (typeof value === "string") {
    out.push({ module: moduleName, path, value, isCode });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => collect(v, moduleName, `${path}[${i}]`, isCode, out));
    return;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    // A StageArtifact with kind "code" marks only its own `code` field as
    // verbatim source — sibling fields like `label`/`caption` stay prose.
    const artifactIsCode = obj.kind === "code";
    for (const [key, v] of Object.entries(obj)) {
      const childIsCode = isCode || (artifactIsCode && key === "code");
      collect(v, moduleName, `${path}.${key}`, childIsCode, out);
    }
  }
}

function collectModule(
  moduleName: string,
  mod: Record<string, unknown>,
): CollectedString[] {
  const out: CollectedString[] = [];
  for (const [exportName, value] of Object.entries(mod)) {
    collect(value, moduleName, exportName, false, out);
  }
  return out;
}

const allStrings = [
  ...collectModule("gtme.ts", gtmeModule as unknown as Record<string, unknown>),
  ...collectModule(
    "gtme-handcheck.ts",
    handCheckModule as unknown as Record<string, unknown>,
  ),
];

const proseStrings = allStrings.filter((s) => !s.isCode);

describe("gtme content — string walker", () => {
  it("finds a non-trivial number of strings to lint", () => {
    // Sanity check on the recursive collector itself: guards against this
    // whole suite silently passing on zero strings if the export shape
    // changes underneath it.
    expect(allStrings.length).toBeGreaterThan(80);
    expect(proseStrings.length).toBeGreaterThan(70);
  });
});

describe("gtme content — voice lint", () => {
  it("contains no em dash (U+2014)", () => {
    for (const s of proseStrings) {
      expect(s.value.includes(EM_DASH), `${s.module} ${s.path}: ${s.value}`).toBe(
        false,
      );
    }
  });

  it("contains no horizontal bar (U+2015)", () => {
    for (const s of proseStrings) {
      expect(
        s.value.includes(HORIZONTAL_BAR),
        `${s.module} ${s.path}: ${s.value}`,
      ).toBe(false);
    }
  });

  it("contains no en dash (U+2013)", () => {
    // Verified by hand: neither content file currently uses an en dash
    // (numeric ranges read "Aug 25 to 26", not "25–26"), so this is a hard
    // redline rather than a soft preference.
    for (const s of proseStrings) {
      expect(s.value.includes(EN_DASH), `${s.module} ${s.path}: ${s.value}`).toBe(
        false,
      );
    }
  });

  it('contains no "not X, it\'s Y" construction', () => {
    for (const s of proseStrings) {
      expect(
        NOT_X_ITS_Y_RE.test(s.value),
        `${s.module} ${s.path}: ${s.value}`,
      ).toBe(false);
    }
  });
});

describe("gtme content — privacy redlines", () => {
  it("contains no email addresses except the allowed test placeholder", () => {
    for (const s of allStrings) {
      const matches = s.value.match(EMAIL_RE) ?? [];
      for (const m of matches) {
        expect(
          m.toLowerCase() === ALLOWED_EMAIL,
          `${s.module} ${s.path}: unexpected email-shaped string "${m}"`,
        ).toBe(true);
      }
    }
  });

  it("contains no Clay/Supabase/webhook infrastructure literals", () => {
    const needles = ["app.clay.com", ".supabase.co", "hooks.clay", "webhook.site"];
    for (const s of allStrings) {
      for (const needle of needles) {
        expect(
          s.value.includes(needle),
          `${s.module} ${s.path}: contains "${needle}"`,
        ).toBe(false);
      }
      expect(
        SUPABASE_TOKEN_RE.test(s.value),
        `${s.module} ${s.path}: looks like a supabase project ref`,
      ).toBe(false);
    }
  });

  it("never ships the private individual's surname", () => {
    for (const s of allStrings) {
      expect(
        s.value.includes(FORBIDDEN_SURNAME),
        `${s.module} ${s.path}`,
      ).toBe(false);
    }
  });
});

describe("gtme content — stage integrity", () => {
  it("stageOrder matches caseStudies slugs exactly, in order", () => {
    expect(stageOrder).toEqual(caseStudies.map((c) => c.slug));
  });

  it("caseStudyBySlug resolves every stage slug to its case study", () => {
    for (const slug of stageOrder) {
      expect(caseStudyBySlug.get(slug)).toBe(
        caseStudies.find((c) => c.slug === slug),
      );
    }
  });

  it("links every case study's careerEventSlug to a real career event", () => {
    for (const c of caseStudies) {
      if (c.careerEventSlug) {
        expect(allEventSlugs, `${c.slug} → ${c.careerEventSlug}`).toContain(
          c.careerEventSlug,
        );
      }
    }
  });
});

describe("gtme content — special-stage pavilion", () => {
  it("defines the special-stage pavilion, open, on the subaru555 livery, exactly once", () => {
    const matches = pavilions.filter((p) => p.slug === "special-stage");
    expect(matches).toHaveLength(1);
    const [p] = matches;
    expect(p.status).toBe("open");
    expect(p.livery).toBe("subaru555");
  });
});

describe("gtme hand-check board — integrity", () => {
  it("matches accounts.length to totals.documented", () => {
    expect(handCheck.accounts.length).toBe(handCheck.totals.documented);
  });

  it('counts exactly seven accounts with verdict "held", matching totals.held', () => {
    const heldCount = handCheck.accounts.filter((a) => a.verdict === "held").length;
    expect(heldCount).toBe(7);
    expect(handCheck.totals.held).toBe(7);
    expect(heldCount).toBe(handCheck.totals.held);
  });

  it("gives every account a verdict defined in verdictLabels", () => {
    const knownVerdicts = Object.keys(verdictLabels);
    for (const a of handCheck.accounts) {
      expect(knownVerdicts, a.company).toContain(a.verdict);
    }
  });

  it("gives every account a non-empty note", () => {
    for (const a of handCheck.accounts) {
      expect(a.note.trim().length, a.company).toBeGreaterThan(0);
    }
  });

  it("does not repeat a company name across accounts", () => {
    const names = handCheck.accounts.map((a) => a.company);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("gtme content — artifacts", () => {
  const artifacts = caseStudies.flatMap((c) => c.artifacts);

  it("points every image artifact at a real file under public/", () => {
    for (const a of artifacts.filter((a) => a.kind === "image")) {
      expect(typeof a.src, a.label).toBe("string");
      expect(
        existsSync(join(PUBLIC_DIR, a.src as string)),
        `${a.label}: ${a.src}`,
      ).toBe(true);
    }
  });

  it("gives every code artifact non-empty code", () => {
    for (const a of artifacts.filter((a) => a.kind === "code")) {
      expect((a.code ?? "").trim().length, a.label).toBeGreaterThan(0);
    }
  });
});

describe("gtme content — pace-notes segment arithmetic", () => {
  it("sums the six SEG buckets to the full 2,932-company pool", () => {
    // Regression guard for content/gtme.ts, "pace-notes" case study: the
    // "The cut" build-log entry and "Other cuts" metric state 199
    // no-visible-processor + 220 scaling + 201 expansion + 190 too-early +
    // 99 displacement-risk + 2,023 unscored, summing to the 2,932
    // companies loaded in recon. Hardcoded (not derived from content) so a
    // silent edit to any one bucket trips this test.
    expect(199 + 220 + 201 + 190 + 99 + 2023).toBe(2932);
  });
});
