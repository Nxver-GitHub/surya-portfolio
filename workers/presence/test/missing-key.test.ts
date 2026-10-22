import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import worker, { type Env } from "../src/index";
import { hasIpKey } from "../src/room";
import { ALLOWED_ORIGIN } from "../src/logic";
import { PRESENCE_URL } from "./helpers";

/**
 * PRESENCE_IP_KEY is required. Without it the per-IP cap used to hash under a
 * per-instance random key that reset on every hibernation wake; now the Worker
 * refuses the upgrade outright, in the same shape as its other refusals.
 */
const bound = env as unknown as Env;

function upgradeRequest(): Request {
  return new Request(PRESENCE_URL, {
    headers: {
      Upgrade: "websocket",
      Origin: ALLOWED_ORIGIN,
      "cf-connecting-ip": "10.200.0.1",
    },
  });
}

function call(overrides: Partial<Env>, request: Request): Promise<Response> {
  const fetch = worker.fetch as (request: Request, env: Env) => Promise<Response>;
  return fetch(request, { ...bound, ...overrides });
}

describe("PRESENCE_IP_KEY is required", () => {
  it("the test run binds a key, so the rest of the suite exercises the real path", () => {
    expect(hasIpKey(bound)).toBe(true);
  });

  it("refuses the upgrade with 503 when the key is missing", async () => {
    const response = await call({ PRESENCE_IP_KEY: undefined }, upgradeRequest());
    expect(response.status).toBe(503);
    expect(await response.text()).toBe("presence unavailable");
    expect(response.webSocket).toBeNull();
  });

  it("refuses the upgrade with 503 when the key is an empty string", async () => {
    const response = await call({ PRESENCE_IP_KEY: "" }, upgradeRequest());
    expect(response.status).toBe(503);
  });

  it("still answers /health without the key", async () => {
    const response = await call(
      { PRESENCE_IP_KEY: undefined },
      new Request("https://live.suryapugaz.com/health"),
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");
  });

  it("checks Origin before the key, so a foreign page still sees 403", async () => {
    const request = new Request(PRESENCE_URL, {
      headers: { Upgrade: "websocket", Origin: "https://evil.example" },
    });
    const response = await call({ PRESENCE_IP_KEY: undefined }, request);
    expect(response.status).toBe(403);
  });
});
