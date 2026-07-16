import { describe, expect, it, vi } from "vitest";
import {
  adminHelpLines,
  formatElapsed,
  formatLogs,
  formatStats,
  formatSysinfo,
  formatUptime,
  relativeTimestamp,
  resolveAdminCommand,
} from "../src/components/cafe/terminal/adminCommands";
import {
  ADMIN_DATA_PATH,
  fetchAdminData,
  isAdminDataResponse,
} from "../src/components/cafe/terminal/adminData";
import type { AdminDataResponse } from "../src/app/api/admin/data/route";

const SAMPLE: AdminDataResponse = {
  logs: [
    { t: 1_000, q: "what stack is the site built on?", src: "admin" },
    { t: 500, q: "how do I reach Surya?", src: "guest" },
  ],
  stats: {
    viewsByRoute7d: { "/garage": 42, "/cafe": 7 },
    chatsPerDay7d: [
      { day: "2026-07-14", count: 3 },
      { day: "2026-07-15", count: 5 },
    ],
    adminChatsPerDay7d: [
      { day: "2026-07-14", count: 1 },
      { day: "2026-07-15", count: 2 },
    ],
  },
  sysinfo: {
    sha: "abcdef1234567890",
    deployedAt: "2026-07-15T00:00:00.000Z",
    node: "v20.11.0",
  },
};

function texts(lines: readonly { text: string }[]): string[] {
  return lines.map((l) => l.text);
}

describe("resolveAdminCommand", () => {
  it("maps data verbs to a data fetch", () => {
    for (const command of ["logs", "stats", "sysinfo", "uptime"] as const) {
      expect(resolveAdminCommand(command)).toEqual({ kind: "data", command });
    }
  });

  it("is case-insensitive and ignores trailing args", () => {
    expect(resolveAdminCommand("  LOGS --all ")).toEqual({
      kind: "data",
      command: "logs",
    });
  });

  it("resolves help/clear/logout and empty/unknown", () => {
    expect(resolveAdminCommand("help").kind).toBe("print");
    expect(resolveAdminCommand("clear")).toEqual({ kind: "clear" });
    expect(resolveAdminCommand("logout")).toEqual({ kind: "logout" });
    expect(resolveAdminCommand("   ")).toEqual({ kind: "empty" });
    expect(resolveAdminCommand("rm -rf /")).toEqual({
      kind: "unknown",
      input: "rm -rf /",
    });
  });

  it("help lists every admin command verb", () => {
    const body = texts(adminHelpLines()).join("\n");
    for (const verb of ["logs", "stats", "sysinfo", "uptime", "logout"]) {
      expect(body).toContain(verb);
    }
  });

  it("help is a SUPERSET — it also lists the guest commands and the chat note", () => {
    const body = texts(adminHelpLines()).join("\n");
    // Guest commands work in admin too, so admin help must surface them.
    for (const verb of ["about", "projects", "contact", "exit"]) {
      expect(body).toContain(verb);
    }
    // And the note that free text just chats.
    expect(body.toLowerCase()).toContain("type a question");
  });
});

describe("relativeTimestamp / formatElapsed", () => {
  it("buckets deltas into just now / m / h / d", () => {
    const now = 10_000_000_000;
    expect(relativeTimestamp(now, now)).toBe("just now");
    expect(relativeTimestamp(now - 90_000, now)).toBe("1m ago");
    expect(relativeTimestamp(now - 3 * 3600_000, now)).toBe("3h ago");
    expect(relativeTimestamp(now - 2 * 86_400_000, now)).toBe("2d ago");
  });

  it("clamps future timestamps to just now", () => {
    const now = 1_000;
    expect(relativeTimestamp(now + 5000, now)).toBe("just now");
  });

  it("formats elapsed durations and clamps negatives", () => {
    const from = 0;
    expect(formatElapsed(from, 0)).toBe("00h 00m");
    expect(formatElapsed(from, 90 * 60_000)).toBe("01h 30m");
    expect(formatElapsed(from, (2 * 1440 + 65) * 60_000)).toBe("2d 01h 05m");
    expect(formatElapsed(1000, 0)).toBe("00h 00m");
  });
});

describe("formatLogs", () => {
  it("renders a header, newest-first rows, each verbatim", () => {
    const now = 2_000;
    const lines = formatLogs(SAMPLE.logs, now);
    expect(lines[0].text).toContain("QUESTION LOG");
    // Two rows, order preserved (route already returns newest first).
    expect(lines[1].text).toContain("what stack is the site built on?");
    expect(lines[2].text).toContain("how do I reach Surya?");
    // Each row carries its server-derived source tag.
    expect(lines[1].text).toContain("[ADMIN]");
    expect(lines[2].text).toContain("[GUEST]");
    // Every question row is verbatim (attacker-controlled → never linkified).
    expect(lines[1].verbatim).toBe(true);
    expect(lines[2].verbatim).toBe(true);
  });

  it("shows an empty-state line when there are no questions", () => {
    const lines = formatLogs([], 0);
    expect(texts(lines).join("\n")).toContain("no questions logged");
  });
});

describe("formatStats / formatSysinfo / formatUptime", () => {
  it("stats renders both sections with counts and days", () => {
    const body = texts(formatStats(SAMPLE.stats)).join("\n");
    expect(body).toContain("VIEWS BY ROUTE");
    expect(body).toContain("/garage");
    expect(body).toContain("42");
    expect(body).toContain("CHATS PER DAY");
    expect(body).toContain("2026-07-15");
    // Admin chats appear as their OWN clearly-separated section.
    expect(body).toContain("ADMIN CHATS");
  });

  it("sysinfo shortens the sha and names the framework", () => {
    const body = texts(formatSysinfo(SAMPLE.sysinfo)).join("\n");
    expect(body).toContain("abcdef1"); // 7-char short sha
    expect(body).not.toContain("abcdef1234567890"); // never the full sha
    expect(body).toContain("v20.11.0");
    expect(body).toContain("Next.js");
  });

  it("uptime reports elapsed time since deployedAt", () => {
    const now = Date.parse(SAMPLE.sysinfo.deployedAt) + 90 * 60_000;
    const body = texts(formatUptime(SAMPLE.sysinfo, now)).join("\n");
    expect(body).toContain("UPTIME");
    expect(body).toContain("01h 30m");
  });
});

describe("fetchAdminData (mock fetch)", () => {
  function jsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  }

  it("GETs the data route same-origin and returns the typed payload", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, SAMPLE));
    const res = await fetchAdminData(fetchImpl);
    expect(fetchImpl).toHaveBeenCalledWith(
      ADMIN_DATA_PATH,
      expect.objectContaining({ method: "GET", credentials: "same-origin" }),
    );
    expect(res).toEqual({ ok: true, data: SAMPLE });
  });

  it("401 -> expired (session dropped mid-use)", async () => {
    const res = await fetchAdminData(async () => jsonResponse(401, {}));
    expect(res).toEqual({ ok: false, reason: "expired" });
  });

  it("non-200 / malformed body / network error -> error", async () => {
    expect(await fetchAdminData(async () => jsonResponse(503, {}))).toEqual({
      ok: false,
      reason: "error",
    });
    expect(
      await fetchAdminData(async () => jsonResponse(200, { nope: true })),
    ).toEqual({ ok: false, reason: "error" });
    expect(
      await fetchAdminData(async () => {
        throw new Error("offline");
      }),
    ).toEqual({ ok: false, reason: "error" });
  });

  it("isAdminDataResponse rejects non-conforming shapes", () => {
    expect(isAdminDataResponse(SAMPLE)).toBe(true);
    expect(isAdminDataResponse(null)).toBe(false);
    expect(isAdminDataResponse({ logs: {} })).toBe(false);
  });
});
