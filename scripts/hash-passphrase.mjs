/**
 * hash-passphrase — generate a new-format ADMIN_PASSPHRASE_SCRYPT value.
 *
 * The admin passphrase is NEVER stored anywhere in plaintext. This script reads
 * a passphrase from you interactively (echo suppressed, never argv, never env),
 * derives a scrypt digest at the SCRYPT_PARAMS cost `src/lib/adminAuth.ts`
 * currently uses, and prints the `<N>:<r>:<p>:<saltHex>:<hashHex>` value —
 * the exact string to store in `ADMIN_PASSPHRASE_SCRYPT`.
 *
 * The params are duplicated here (rather than imported) because this script
 * runs as plain Node outside the Next/TypeScript build — it is never bundled
 * by `next build` or `opennextjs-cloudflare build` since nothing under
 * src/app or src/lib imports it. Keep PARAMS in sync with SCRYPT_PARAMS in
 * src/lib/adminAuth.ts; a mismatch just means a freshly-hashed passphrase
 * verifies at a different cost than new logins expect, not a security bug —
 * parseStoredHash reads N/r/p back out of the stored value itself.
 *
 * The plaintext is never logged, never written to disk, and never echoed.
 *
 * Usage:
 *   pnpm hash-passphrase
 *     → prompts for the passphrase (twice, to confirm), prints the new-format
 *       hash plus the exact `wrangler secret put` command to run next.
 *
 *   op read "op://vault/site-admin/password" | node scripts/hash-passphrase.mjs --stdin
 *     → non-interactive via a password-manager pipe. Never echo the
 *       passphrase on the command line — it lands in shell history.
 */

import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline";

/** Must match SCRYPT_PARAMS in src/lib/adminAuth.ts. */
const PARAMS = { N: 2 ** 15, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
/** scrypt output length in bytes — must match SCRYPT_KEYLEN in adminAuth.ts. */
const KEYLEN = 64;
/** Salt length in bytes. */
const SALT_BYTES = 16;

/** Derive the `<N>:<r>:<p>:<saltHex>:<hashHex>` record for a passphrase. */
function hashPassphrase(passphrase) {
  const salt = randomBytes(SALT_BYTES);
  const hash = scryptSync(passphrase, salt, KEYLEN, PARAMS);
  return `${PARAMS.N}:${PARAMS.r}:${PARAMS.p}:${salt.toString("hex")}:${hash.toString("hex")}`;
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
    // historySize: 0 — never buffer the passphrase into readline's in-memory
    // input history, even transiently.
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      historySize: 0,
    });
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
  console.log(
    `\nRun this to store it (never paste the passphrase itself anywhere):\n`,
  );
  console.log(`  wrangler secret put ADMIN_PASSPHRASE_SCRYPT\n`);
  console.log("Then paste this value at the prompt:\n");
  console.log(stored + "\n");
}

main().catch((err) => {
  console.error("Failed to hash passphrase:", err?.message ?? err);
  process.exit(1);
});
