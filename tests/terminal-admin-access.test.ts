import { describe, expect, it, vi } from "vitest";
import {
  accessRequiredMessage,
  fetchAdminEndpoint,
} from "../src/components/cafe/terminal/adminFetch";

/**
 * adminFetch — the shared Cloudflare Access-aware wrapper every
 * `/api/admin/*` client call goes through. See its file header for the full
 * scenario (Access fronting the admin routes, `Clear-Site-Data` wiping the
 * Access cookie on logout).
 */
describe("fetchAdminEndpoint", () => {
  it("always requests redirect: manual, regardless of caller init", async () => {
    const fetchImpl = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async () => new Response("{}", { headers: { "content-type": "application/json" } }),
    );
    await fetchAdminEndpoint("/api/admin/data", { method: "GET" }, fetchImpl);
    const [, init] = fetchImpl.mock.calls[0];
    expect(init?.redirect).toBe("manual");
  });

  it("classifies an opaque redirect as access_required", async () => {
    const opaqueRedirect = {
      type: "opaqueredirect",
      status: 0,
      ok: false,
      headers: new Headers(),
    } as unknown as Response;
    const outcome = await fetchAdminEndpoint(
      "/api/admin/data",
      { method: "GET" },
      async () => opaqueRedirect,
    );
    expect(outcome).toEqual({ kind: "access_required" });
  });

  it("classifies a 2xx with a non-JSON content-type as access_required", async () => {
    const outcome = await fetchAdminEndpoint(
      "/api/admin/data",
      { method: "GET" },
      async () =>
        new Response("<html>login</html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
    );
    expect(outcome).toEqual({ kind: "access_required" });
  });

  it("passes through a normal JSON response untouched", async () => {
    const real = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    const outcome = await fetchAdminEndpoint(
      "/api/admin/data",
      { method: "GET" },
      async () => real,
    );
    expect(outcome).toEqual({ kind: "response", response: real });
  });

  it("passes through a non-2xx JSON-less response untouched (e.g. a 401 with no body)", async () => {
    const real = new Response(null, { status: 401 });
    const outcome = await fetchAdminEndpoint(
      "/api/admin/data",
      { method: "GET" },
      async () => real,
    );
    expect(outcome).toEqual({ kind: "response", response: real });
  });

  it("classifies a thrown/rejected fetch as network_error", async () => {
    const outcome = await fetchAdminEndpoint(
      "/api/admin/data",
      { method: "GET" },
      async () => {
        throw new Error("offline");
      },
    );
    expect(outcome).toEqual({ kind: "network_error" });
  });
});

describe("accessRequiredMessage", () => {
  it("builds the message from the given origin, plain English with one caption-style detail", () => {
    expect(accessRequiredMessage("https://suryapugaz.com")).toBe(
      "Access session missing or expired. Open https://suryapugaz.com/api/admin/data in a new tab, sign in, then retry.",
    );
  });

  it("never hardcodes the site host", () => {
    const message = accessRequiredMessage("https://example-preview.workers.dev");
    expect(message).not.toContain("suryapugaz.com");
    expect(message).toContain("https://example-preview.workers.dev/api/admin/data");
  });
});
