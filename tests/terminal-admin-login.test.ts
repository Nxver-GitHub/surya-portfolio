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

describe("requestAdminLogin — status → outcome (mock fetch)", () => {
  it("POSTs the passphrase to the auth route with same-origin credentials", async () => {
    const fetchImpl = vi.fn(async () => fakeResponse(200, { ok: true }));
    await requestAdminLogin("s3cret", fetchImpl);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(ADMIN_LOGIN_PATH);
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("same-origin");
    expect(init?.body).toBe(JSON.stringify({ passphrase: "s3cret" }));
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
});

describe("requestAdminLogout", () => {
  it("POSTs logout same-origin and swallows failures", async () => {
    const fetchImpl = vi.fn(async () => fakeResponse(200, { ok: true }));
    await requestAdminLogout(fetchImpl);
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/admin/logout",
      expect.objectContaining({ method: "POST", credentials: "same-origin" }),
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
  function transition(result: AdminLoginResult) {
    return adminLoginTransition(result);
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
});
