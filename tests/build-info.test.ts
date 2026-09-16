import { describe, expect, it } from "vitest";
import {
  PLATFORM_NODE,
  PLATFORM_WORKERS,
  SHA_FALLBACK,
  resolveBuildSha,
  resolvePlatform,
} from "@/lib/buildInfo";

describe("buildInfo — resolveBuildSha", () => {
  it("prefers an explicit override over every platform value", () => {
    expect(
      resolveBuildSha({
        explicit: "abc1234",
        vercelGitSha: "def5678",
        cloudflareVersionId: "0e1f2a3b-4c5d-6e7f-8a9b-0c1d2e3f4a5b",
      }),
    ).toBe("abc1234");
  });

  it("uses the Vercel git SHA when there is no override", () => {
    expect(
      resolveBuildSha({
        vercelGitSha: "def5678",
        cloudflareVersionId: "0e1f2a3b-4c5d-6e7f-8a9b-0c1d2e3f4a5b",
      }),
    ).toBe("def5678");
  });

  // On Workers this is a Cloudflare version UUID, not a commit hash — the only
  // build identifier available at request time there.
  it("falls back to the Cloudflare version id on Workers", () => {
    expect(
      resolveBuildSha({
        cloudflareVersionId: "0e1f2a3b-4c5d-6e7f-8a9b-0c1d2e3f4a5b",
      }),
    ).toBe("0e1f2a3b-4c5d-6e7f-8a9b-0c1d2e3f4a5b");
  });

  it("reports the dev fallback when no platform supplies anything", () => {
    expect(resolveBuildSha({})).toBe(SHA_FALLBACK);
  });

  // An unset build variable commonly arrives as "" rather than undefined, which
  // would otherwise win the `??` chain and report an empty SHA.
  it("treats blank and whitespace-only values as absent", () => {
    expect(
      resolveBuildSha({
        explicit: "",
        vercelGitSha: "   ",
        cloudflareVersionId: "0e1f2a3b",
      }),
    ).toBe("0e1f2a3b");
    expect(
      resolveBuildSha({ explicit: "", vercelGitSha: "", cloudflareVersionId: "" }),
    ).toBe(SHA_FALLBACK);
  });

  it("trims surrounding whitespace off the chosen value", () => {
    expect(resolveBuildSha({ vercelGitSha: "  def5678\n" })).toBe("def5678");
  });
});

describe("buildInfo — resolvePlatform", () => {
  it("names the Worker runtime when running on Cloudflare", () => {
    expect(resolvePlatform(true)).toBe(PLATFORM_WORKERS);
    expect(resolvePlatform(true)).toContain("OpenNext");
  });

  it("falls back to the Node runtime name off-Workers", () => {
    expect(resolvePlatform(false)).toBe(PLATFORM_NODE);
  });
});
