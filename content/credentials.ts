/**
 * External credentials: programs completed, each backed by a verification
 * page the issuer hosts and can revoke. This file is the single source of
 * truth — content/licenses.ts, content/gtme.ts and content/career.ts all
 * reference a credential by id rather than restating its dates or URL, so a
 * completion date can never be right on one pavilion and wrong on another.
 *
 * Copy tone (per CLAUDE.md): real issuer, real program, real dates. The
 * racing chrome ("HOMOLOGATION", the plate) lives in the components that
 * render these, never in the facts themselves.
 *
 * Every string here is walked by the gtme voice lint once a credential is
 * attached to the specialStage export, so: no em dashes, no en dashes.
 */

export interface Credential {
  id: string;
  /** The organization that issued and verifies it */
  issuer: string;
  /** Program name */
  program: string;
  /** What the program taught, in plain English */
  track: string;
  /** Which run of the program */
  cohort: string;
  /** Completion date, human-readable and dash-free */
  completed: string;
  /** The issuer's own identifier for this credential, stamped on the plate */
  credentialId: string;
  /** The issuer's public verification page */
  href: string;
}

export const credentials: readonly Credential[] = [
  {
    id: "alphaforge-gtme",
    issuer: "Clay Cohorts",
    program: "AlphaForge",
    track: "GTM Engineering",
    cohort: "Cohort 3",
    completed: "September 21, 2026",
    credentialId: "CC-DIP-ED973D12",
    href: "https://cohorts.clay.com/c/ed973d12-60ce-4e35-8c4d-b961ed4daeea",
  },
];

export const credentialById: ReadonlyMap<string, Credential> = new Map(
  credentials.map((c) => [c.id, c] as const),
);
