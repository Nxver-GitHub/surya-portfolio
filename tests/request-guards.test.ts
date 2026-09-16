import { describe, expect, it } from "vitest";
import {
  MAX_CHAT_BODY_BYTES,
  MAX_TINY_BODY_BYTES,
  declaredLengthExceeds,
  hasTrustedOrigin,
  isTrustedOrigin,
  readCappedJson,
  readCappedStream,
} from "../src/lib/requestGuards";
import { SITE_HOST } from "../src/lib/site";

/** A ReadableStream of one or more UTF-8 chunks, like a real request body. */
function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

/** A POST Request carrying `body`, with the headers a browser would send. */
function post(
  body: string,
  headers: Record<string, string> = {},
): Request {
  return new Request("https://suryapugaz.com/api/test", {
    method: "POST",
    body,
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("requestGuards — origin (CSRF)", () => {
  it("accepts an origin matching the request's own host", () => {
    expect(
      isTrustedOrigin("https://suryapugaz.com", "suryapugaz.com"),
    ).toBe(true);
  });

  it("accepts localhost dev and Worker preview hosts via the host header", () => {
    expect(isTrustedOrigin("http://localhost:3000", "localhost:3000")).toBe(true);
    expect(
      isTrustedOrigin(
        "https://portfolio.surya.workers.dev",
        "portfolio.surya.workers.dev",
      ),
    ).toBe(true);
  });

  it("accepts the canonical site host even when Host was rewritten", () => {
    expect(isTrustedOrigin(`https://${SITE_HOST}`, "internal-proxy")).toBe(true);
  });

  it("rejects a cross-site origin", () => {
    expect(isTrustedOrigin("https://evil.example", "suryapugaz.com")).toBe(false);
  });

  // A lookalike must not pass on a suffix/prefix match.
  it("rejects a lookalike host", () => {
    expect(
      isTrustedOrigin("https://suryapugaz.com.evil.example", "suryapugaz.com"),
    ).toBe(false);
    expect(isTrustedOrigin("https://notsuryapugaz.com", "suryapugaz.com")).toBe(
      false,
    );
  });

  it("rejects a port mismatch on the same hostname", () => {
    expect(isTrustedOrigin("http://localhost:4000", "localhost:3000")).toBe(
      false,
    );
  });

  it('rejects the opaque "null" origin (sandboxed iframe)', () => {
    expect(isTrustedOrigin("null", "suryapugaz.com")).toBe(false);
  });

  it("rejects an unparseable origin", () => {
    expect(isTrustedOrigin("not a url", "suryapugaz.com")).toBe(false);
  });

  // DOCUMENTED POLICY: browsers always send Origin on POST, so a missing one is
  // a non-browser client (curl, an uptime check) and is allowed through to the
  // route's own auth and rate limits.
  it("allows a missing or empty Origin", () => {
    expect(isTrustedOrigin(null, "suryapugaz.com")).toBe(true);
    expect(isTrustedOrigin("   ", "suryapugaz.com")).toBe(true);
  });

  it("reads both headers off a real Request", () => {
    expect(
      hasTrustedOrigin(
        post("{}", { origin: "https://suryapugaz.com", host: "suryapugaz.com" }),
      ),
    ).toBe(true);
    expect(
      hasTrustedOrigin(
        post("{}", { origin: "https://evil.example", host: "suryapugaz.com" }),
      ),
    ).toBe(false);
  });
});

describe("requestGuards — declared content-length", () => {
  it("flags a declared length over the cap", () => {
    expect(declaredLengthExceeds("9000", MAX_TINY_BODY_BYTES)).toBe(true);
  });

  it("passes a declared length at or under the cap", () => {
    expect(declaredLengthExceeds("120", MAX_TINY_BODY_BYTES)).toBe(false);
    expect(
      declaredLengthExceeds(String(MAX_TINY_BODY_BYTES), MAX_TINY_BODY_BYTES),
    ).toBe(false);
  });

  // An absent or junk header is NOT a licence to buffer — it just defers the
  // decision to the streaming cap, which is what actually enforces the limit.
  it("defers on a missing or malformed header", () => {
    expect(declaredLengthExceeds(null, MAX_TINY_BODY_BYTES)).toBe(false);
    expect(declaredLengthExceeds("lots", MAX_TINY_BODY_BYTES)).toBe(false);
    expect(declaredLengthExceeds("-5", MAX_TINY_BODY_BYTES)).toBe(false);
  });
});

describe("requestGuards — capped stream read", () => {
  it("reads a body under the cap, across chunks", async () => {
    const result = await readCappedStream(streamOf('{"a":', '1}'), 1024);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.text).toBe('{"a":1}');
  });

  it("aborts a body over the cap", async () => {
    const result = await readCappedStream(streamOf("x".repeat(2048)), 1024);
    expect(result.ok).toBe(false);
  });

  it("aborts mid-stream rather than buffering every chunk", async () => {
    const result = await readCappedStream(
      streamOf("x".repeat(600), "x".repeat(600), "x".repeat(600)),
      1024,
    );
    expect(result.ok).toBe(false);
  });

  it("accepts a body at exactly the cap", async () => {
    const result = await readCappedStream(streamOf("x".repeat(1024)), 1024);
    expect(result.ok).toBe(true);
  });
});

describe("requestGuards — capped JSON body", () => {
  it("parses a legitimate request", async () => {
    const result = await readCappedJson(
      post(JSON.stringify({ passphrase: "hunter2" })),
      MAX_TINY_BODY_BYTES,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ passphrase: "hunter2" });
  });

  it("rejects an oversized body on the declared length alone", async () => {
    const result = await readCappedJson(
      post(JSON.stringify({ passphrase: "a".repeat(20_000) })),
      MAX_TINY_BODY_BYTES,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("too-large");
  });

  // A chunked upload declares no length; the streaming cap must still hold.
  it("rejects an oversized body with NO content-length", async () => {
    const oversized = new Request("https://suryapugaz.com/api/test", {
      method: "POST",
      body: streamOf("x".repeat(20_000)),
      // @ts-expect-error duplex is required for a stream body and is not in the
      // DOM RequestInit type, but both undici and workerd require it.
      duplex: "half",
    });
    expect(oversized.headers.get("content-length")).toBeNull();
    const result = await readCappedJson(oversized, MAX_TINY_BODY_BYTES);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("too-large");
  });

  it("reports invalid JSON separately from an oversized body", async () => {
    const result = await readCappedJson(post("not json"), MAX_TINY_BODY_BYTES);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid");
  });

  it("gives the chat route enough headroom for a full transcript", async () => {
    // 24k chars of content plus JSON overhead must still fit comfortably.
    const messages = Array.from({ length: 30 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: "x".repeat(800),
    }));
    const result = await readCappedJson(
      post(JSON.stringify({ messages })),
      MAX_CHAT_BODY_BYTES,
    );
    expect(result.ok).toBe(true);
  });
});
