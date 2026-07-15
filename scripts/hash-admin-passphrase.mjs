/**
 * hash-admin-passphrase — generate the ADMIN_PASSPHRASE_SCRYPT value locally.
 *
 * The admin passphrase is NEVER stored anywhere in plaintext. This script reads
 * a passphrase from you interactively (echo suppressed), derives a scrypt digest
 * with a fresh random salt, and prints ONLY `salt:hash` (both hex) — the exact
 * string to paste into the ADMIN_PASSPHRASE_SCRYPT env var (Vercel / .env.local).
 *
 * The plaintext is never logged, never written to disk, and never echoed.
 *
 * Usage:
 *   node scripts/hash-admin-passphrase.mjs
 *     → prompts for the passphrase (twice, to confirm), prints salt:hash
 *
 *   echo -n "my passphrase" | node scripts/hash-admin-passphrase.mjs --stdin
 *     → non-interactive (CI / password manager pipe); prints salt:hash
 *
 * You ALSO need an ADMIN_SESSION_SECRET (a random HMAC key). Generate one with:
 *   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
 */

import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline";

/** scrypt output length in bytes — must match SCRYPT_KEYLEN in src/lib/adminAuth.ts. */
const KEYLEN = 64;
/** Salt length in bytes. */
const SALT_BYTES = 16;

/** Derive the `salt:hash` record for a passphrase. */
function hashPassphrase(passphrase) {
  const salt = randomBytes(SALT_BYTES);
  const hash = scryptSync(passphrase, salt, KEYLEN);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

/** Read all of stdin as a UTF-8 string (for the --stdin pipe mode). */
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");
}

/** Prompt for a line with terminal echo suppressed (nothing is shown as typed). */
function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    // Suppress echo: swallow every write the readline would make after the prompt.
    const output = rl.output;
    let muted = false;
    const realWrite = output.write.bind(output);
    output.write = (chunk, ...rest) => {
      if (muted) return true;
      return realWrite(chunk, ...rest);
    };
    realWrite(question);
    muted = true;
    rl.question("", (answer) => {
      muted = false;
      realWrite("\n");
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const useStdin = process.argv.includes("--stdin");

  let passphrase;
  if (useStdin) {
    passphrase = await readStdin();
    if (!passphrase) {
      console.error("Error: empty passphrase on stdin.");
      process.exit(1);
    }
  } else {
    passphrase = await promptHidden("Admin passphrase: ");
    if (!passphrase) {
      console.error("Error: empty passphrase.");
      process.exit(1);
    }
    const confirm = await promptHidden("Confirm passphrase: ");
    if (confirm !== passphrase) {
      console.error("Error: passphrases do not match.");
      process.exit(1);
    }
  }

  const stored = hashPassphrase(passphrase);
  // Only the digest is printed — never the plaintext.
  process.stdout.write("\nADMIN_PASSPHRASE_SCRYPT=" + stored + "\n");
}

main().catch((err) => {
  console.error("Failed to hash passphrase:", err?.message ?? err);
  process.exit(1);
});
