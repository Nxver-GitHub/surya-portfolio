import { describe, expect, it, vi } from "vitest";
import {
  ADMIN_LOGIN_PATH,
  adminLoginTransition,
  requestAdminLogin,
  requestAdminLogout,
  type AdminLoginResult,
} from "../src/components/cafe/terminal/adminLogin";
import { LOGIN_PROMPT } from "../src/components/cafe/terminal/loginMachine";

/** Build a fake Response for a given status + optional body/headers. */
function fakeResponse(
  status: number,
  body: unknown = {},
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

/**
 * Build a fake "opaque redirect" response — what `fetch` returns for a
 * `redirect: "manual"` request whose target redirected cross-origin (the
 * Cloudflare Access login flow). The real `Response` constructor can't
 * produce one (`type` is a read-only getter defaulting to "default"), so this
 * is a plain object satisfying the minimal shape adminFetch.ts reads.
 */
function fakeOpaqueRedirect(): Response {
  return {
    type: "opaqueredirect",
    status: 0,
    ok: false,
    headers: new Headers(),
  } as unknown as Response;
}

/** A fake 200 response whose body is HTML (Access's own login page slipping
 * through as a "successful" response instead of a real redirect). */
function fakeHtmlResponse(): Response {
  return new Response("<html>sign in with Access</html>", {
    status: 200,
    headers: { "content-type": "text/html" },
  });
}

describe("requestAdminLogin — status → outcome (mock fetch)", () => {
  it("POSTs the passphrase to the auth route with same-origin credentials", async () => {
    const fetchImpl = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => fakeResponse(200, { ok: true }));
    await requestAdminLogin("s3cret", fetchImpl);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(ADMIN_LOGIN_PATH);
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("same-origin");
    expect(init?.body).toBe(JSON.stringify({ passphrase: "s3cret" }));
    // Always manual — see adminFetch.ts. A caller-followed redirect to
    // Access's cross-origin login page is exactly what this must avoid.
    expect(init?.redirect).toBe("manual");
  });

  it("200 -> granted", async () => {
    const result = await requestAdminLogin("pw", async () => fakeResponse(200));
    expect(result).toEqual({ outcome: "granted" });
  });

  it("401 -> denied", async () => {
    const result = await requestAdminLogin("pw", async () => fakeResponse(401));
    expect(result).toEqual({ outcome: "denied" });
  });

  it("429 -> cooldown, surfacing retry-after from the header", async () => {
    const result = await requestAdminLogin("pw", async () =>
      fakeResponse(429, { error: "RATE_LIMITED" }, { "retry-after": "42" }),
    );
    expect(result.outcome).toBe("cooldown");
    expect(result.retryAfterSeconds).toBe(42);
  });

  it("429 -> cooldown, falling back to the JSON body window", async () => {
    const result = await requestAdminLogin("pw", async () =>
      fakeResponse(429, { retryAfterSeconds: 17 }),
    );
    expect(result.outcome).toBe("cooldown");
    expect(result.retryAfterSeconds).toBe(17);
  });

  it("503 -> unconfigured", async () => {
    const result = await requestAdminLogin("pw", async () => fakeResponse(503));
    expect(result).toEqual({ outcome: "unconfigured" });
  });

  it("unexpected status -> error", async () => {
    const result = await requestAdminLogin("pw", async () => fakeResponse(500));
    expect(result).toEqual({ outcome: "error" });
  });

  it("network failure -> error (fail safe, never granted)", async () => {
    const result = await requestAdminLogin("pw", async () => {
      throw new Error("offline");
    });
    expect(result).toEqual({ outcome: "error" });
  });

  it("opaque redirect (Cloudflare Access) -> access_required, not denied", async () => {
    const result = await requestAdminLogin("pw", async () => fakeOpaqueRedirect());
    expect(result).toEqual({ outcome: "access_required" });
  });

  it("a 200 with an HTML body (Access login page slipping through) -> access_required", async () => {
    const result = await requestAdminLogin("pw", async () => fakeHtmlResponse());
    expect(result).toEqual({ outcome: "access_required" });
  });
});

describe("requestAdminLogout", () => {
  it("POSTs logout same-origin and swallows failures", async () => {
    const fetchImpl = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => fakeResponse(200, { ok: true }));
    await requestAdminLogout(fetchImpl);
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/admin/logout",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        redirect: "manual",
      }),
    );

    // A throwing fetch must not reject.
    await expect(
      requestAdminLogout(async () => {
        throw new Error("offline");
      }),
    ).resolves.toBeUndefined();
  });
});

describe("adminLoginTransition — outcome → state + lines", () => {
  const ORIGIN = "https://suryapugaz.com";

  function transition(result: AdminLoginResult) {
    return adminLoginTransition(result, ORIGIN);
  }

  it("granted -> admin console", () => {
    const t = transition({ outcome: "granted" });
    expect(t.next).toBe("admin");
    expect(t.lines[0].text).toContain("root access granted");
  });

  it("denied -> stays on password prompt for a retry", () => {
    const t = transition({ outcome: "denied" });
    expect(t.next).toBe("password");
    expect(t.lines[0].tone).toBe("error");
    expect(t.lines[0].text).toContain("ACCESS DENIED");
    expect(t.lines[1].text).toBe("password:");
  });

  it("cooldown -> drops to login with the retry window", () => {
    const t = transition({ outcome: "cooldown", retryAfterSeconds: 30 });
    expect(t.next).toBe("login");
    expect(t.lines[0].text).toContain("TOO MANY ATTEMPTS");
    expect(t.lines[0].text).toContain("30s");
    expect(t.lines[1].text).toBe(LOGIN_PROMPT);
  });

  it("unconfigured -> login line, framed as intentional (not broken)", () => {
    const t = transition({ outcome: "unconfigured" });
    expect(t.next).toBe("login");
    expect(t.lines[0].tone).toBe("system");
    expect(t.lines[0].text).toContain("not configured");
  });

  it("error -> stays on password prompt for a retry", () => {
    const t = transition({ outcome: "error" });
    expect(t.next).toBe("password");
    expect(t.lines[0].tone).toBe("error");
  });

  it("access_required -> stays on password prompt, with the Access sign-in message (site origin, not hardcoded)", () => {
    const t = transition({ outcome: "access_required" });
    expect(t.next).toBe("password");
    expect(t.lines[0].tone).toBe("error");
    expect(t.lines[0].text).toBe(
      "Access session missing or expired. Open https://suryapugaz.com/api/admin/data in a new tab, sign in, then retry.",
    );
    expect(t.lines[1].text).toBe("password:");
  });

  it("access_required uses the passed-in origin, not a hardcoded host", () => {
    const t = adminLoginTransition(
      { outcome: "access_required" },
      "https://preview.example.workers.dev",
    );
    expect(t.lines[0].text).toContain(
      "https://preview.example.workers.dev/api/admin/data",
    );
  });
});
