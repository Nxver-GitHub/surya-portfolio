import { describe, expect, it } from "vitest";
import { ADMIN_CACHE_CONTROL, adminJson } from "../src/lib/adminResponse";

describe("adminJson", () => {
  it("serializes the body with JSON content-type and private, no-store", async () => {
    const res = adminJson({ ok: true }, 200);
    expect(ADMIN_CACHE_CONTROL).toBe("private, no-store");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/json");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(await res.json()).toEqual({ ok: true });
  });

  it("keeps extra headers, including several set-cookie values", () => {
    const extra = new Headers();
    extra.append("set-cookie", "a=1; Path=/");
    extra.append("set-cookie", "b=2; Path=/");
    extra.set("retry-after", "5");
    const res = adminJson({ error: "X" }, 429, extra);
    expect(res.headers.getSetCookie()).toEqual(["a=1; Path=/", "b=2; Path=/"]);
    expect(res.headers.get("retry-after")).toBe("5");
  });

  it("never lets a caller weaken the cache policy", () => {
    const res = adminJson({}, 200, { "cache-control": "public, max-age=3600" });
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });
});
