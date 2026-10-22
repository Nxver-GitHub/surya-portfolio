/**
 * Test-only Cloudflare Access JWT factory: a real RSA key pair (Web Crypto), a
 * JWKS body shaped like `https://<team>/cdn-cgi/access/certs`, and a signer
 * that can produce valid tokens or deliberately broken ones.
 */

export const TEAM_DOMAIN = "testteam.cloudflareaccess.com";
export const ISSUER = `https://${TEAM_DOMAIN}`;
export const CERTS_URL = `${ISSUER}/cdn-cgi/access/certs`;
export const AUD = "test-aud-tag-0123456789abcdef";
export const OWNER_EMAIL = "owner@example.test";

const RS256 = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" } as const;

export interface TestKey {
  readonly kid: string;
  readonly privateKey: CryptoKey;
  readonly jwk: JsonWebKey & { kid: string };
}

export async function makeKey(kid: string): Promise<TestKey> {
  const pair = (await crypto.subtle.generateKey(
    { ...RS256, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const exported = await crypto.subtle.exportKey("jwk", pair.publicKey);
  return {
    kid,
    privateKey: pair.privateKey,
    jwk: { kty: "RSA", n: exported.n, e: exported.e, alg: "RS256", use: "sig", kid },
  };
}

export function jwksBody(...keys: TestKey[]): unknown {
  return { keys: keys.map((k) => k.jwk), public_cert: { kid: keys[0]?.kid, cert: "x" } };
}

export function b64url(value: string | Uint8Array): string {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  return Buffer.from(bytes).toString("base64url");
}

/** Standard valid claims, `nowMs` as the issue time. */
export function claims(nowMs: number, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const now = Math.floor(nowMs / 1000);
  return {
    aud: [AUD],
    email: OWNER_EMAIL,
    exp: now + 3600,
    iat: now,
    nbf: now,
    iss: ISSUER,
    type: "app",
    identity_nonce: "nonce",
    sub: "user-id",
    ...overrides,
  };
}

/** Sign `payload` with `key` (RS256), with optional header overrides. */
export async function signJwt(
  key: TestKey,
  payload: Record<string, unknown>,
  headerOverrides: Record<string, unknown> = {},
): Promise<string> {
  const header = { alg: "RS256", kid: key.kid, typ: "JWT", ...headerOverrides };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const sig = new Uint8Array(
    await crypto.subtle.sign(RS256.name, key.privateKey, new TextEncoder().encode(signingInput)),
  );
  return `${signingInput}.${b64url(sig)}`;
}
