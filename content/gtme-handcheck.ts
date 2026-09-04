/**
 * The SEG1 hand-check board: 30 accounts checked by hand against the claim
 * the segment name makes, 15 of them documented well enough to publish.
 * Companies only. No personal names, no email addresses, and no account is
 * marked as having received an email.
 *
 * Same voice rules as gtme.ts: no em dashes, no "it's not X, it's Y",
 * first person, plain language.
 */

export type HandCheckVerdict =
  | "held"
  | "sales_led"
  | "auth_walled"
  | "domain_mismatch"
  | "dead_template"
  | "scan_blind";

export interface HandCheckAccount {
  company: string;
  domain: string;
  verdict: HandCheckVerdict;
  note: string;
}

export const verdictLabels: Record<
  HandCheckVerdict,
  { label: string; description: string; holds: boolean }
> = {
  held: {
    label: "HELD",
    description: "The in-house billing hypothesis survived hand research.",
    holds: true,
  },
  sales_led: {
    label: "SALES-LED",
    description: "No checkout for a scan to inspect.",
    holds: false,
  },
  auth_walled: {
    label: "AUTH-WALLED",
    description: "The checkout sits behind authentication.",
    holds: false,
  },
  domain_mismatch: {
    label: "DOMAIN MISMATCH",
    description: "Marketing and product live on different domains.",
    holds: false,
  },
  dead_template: {
    label: "DEAD TEMPLATE",
    description: "Template scaffolding wired to nothing.",
    holds: false,
  },
  scan_blind: {
    label: "SCAN-BLIND",
    description: "The absence was a fact about the docs rather than the company.",
    holds: false,
  },
};

export const handCheck = {
  chrome: "RECCE BOARD",
  heading: "The hand-check: 30 accounts against one claim",
  summary: [
    "The segment said no visible processor. The hypothesis behind it said in-house billing. I checked 30 accounts by hand to see whether the second claim survived the first, and it held for 7.",
    "Fifteen of the thirty checks survived to a file with a verdict attached. The other fifteen lived in the working session and were never written down, which is its own small lesson about build logs. The gap is stated here instead of hidden, for the same reason the segment got renamed.",
  ],
  /** Session-sourced summary counts for the full 30 */
  totals: {
    checked: 30,
    held: 7,
    documented: 15,
  },
  accounts: [
    {
      company: "Beam",
      domain: "beam.cloud",
      verdict: "held",
      note: "The open-source runtime carries a hand-built metering stack: launch-time credit checks in cents, a background reconciler that records usage and terminates workers on credit exhaustion, and a per-pool minimum-credit threshold. No Stripe reference in the repo tree.",
    },
    {
      company: "PropelAuth",
      domain: "propelauth.com",
      verdict: "held",
      note: "Two usage dimensions metered in-house: five cents per monthly active user above a 10,000 floor, and a hundredth of a cent per API key validation above 1.5 million included. A fetch-usage endpoint ships in the changelog, so the usage read path is theirs.",
    },
    {
      company: "hoop.dev",
      domain: "hoop.dev",
      verdict: "held",
      note: "Commercial entitlements run on a homegrown signed-license system, where an empty license state is treated as an open-source install. The automated gate filed this account as sales-led, and the in-house billing work was real anyway.",
    },
    {
      company: "IOMETE",
      domain: "iomete.com",
      verdict: "held",
      note: "Licensing is metered at $500 per vCPU per year against the vCPUs visible to Kubernetes, allocated rather than physical cores, which puts the meter inside the customer's own self-hosted cluster.",
    },
    {
      company: "Contalink",
      domain: "contalink.com",
      verdict: "held",
      note: "Subscription billing runs inside their own app. A help article walks users through storing a card so the charge fires on the cut-off date, with a fixed bank account as the manual alternative. No processor is named anywhere.",
    },
    {
      company: "ContraForce",
      domain: "contraforce.com",
      verdict: "held",
      note: "Consumption is metered on a unit they defined themselves: one agent run covering a full investigation of a single incident, with the per-incident rate walked through by their team rather than published.",
    },
    {
      company: "Cotera",
      domain: "cotera.co",
      verdict: "held",
      note: "Credits are the billing primitive rather than seats or calls. Usage scales with tokens processed and each tool carries its own credit cost, with 1,000 free and 100k bundled into the Team plan.",
    },
    {
      company: "ZOKO",
      domain: "zoko.io",
      verdict: "sales_led",
      note: "Filed as sales-led by the gate. Three distinct monthly charges sit on top of a prepaid credit wallet, and conversations are metered to four decimal places, so the in-house metering is real regardless of the gate verdict.",
    },
    {
      company: "BrioHR",
      domain: "briohr.com",
      verdict: "sales_led",
      note: "Filed as sales-led by the gate. Every module carries the same true-up rule: contract cost compares the minimum contractual amount against actual billable employees each month and charges the higher of the two, per module, against a $50 floor.",
    },
    {
      company: "Jestor",
      domain: "jestor.com",
      verdict: "auth_walled",
      note: "The checkout sits behind authentication, so there is no purchase path a scan can reach from outside.",
    },
    {
      company: "Superwall",
      domain: "superwall.com",
      verdict: "auth_walled",
      note: "Checkout behind authentication. Superwall also sells subscription billing infrastructure and runs on the processor my email would have claimed was absent, so the claim would have been wrong about them anyway.",
    },
    {
      company: "Agave",
      domain: "useagave.com",
      verdict: "domain_mismatch",
      note: "Marketing lives on useagave.com while the product, docs and login all live on agaveapi.com, so the crawler never reached the surface where billing would be. Recorded in the send seed as a bug in my scan rather than a finding about the company.",
    },
    {
      company: "Weekday",
      domain: "weekday.works",
      verdict: "dead_template",
      note: "An inert Webflow cart wired to nothing. The template scaffolding reads as a checkout to a scanner and is connected to no payment path.",
    },
    {
      company: "Strac",
      domain: "strac.io",
      verdict: "dead_template",
      note: "Dead template scaffolding; the site footer still links the template it was built from. The real pricing motion is a quote configurator over surfaces, integrations, data volume and headcount, resolved to an itemized quote in 24 hours.",
    },
    {
      company: "Evidently AI",
      domain: "evidentlyai.com",
      verdict: "scan_blind",
      note: "The complete docs index carries no billing, plans or payment page at all for a paid cloud tier, while a full self-hosting guide is published. Absence of a payment surface here is a fact about the docs rather than evidence of an in-house build.",
    },
  ],
  undocumentedNote:
    "15 more accounts were checked in the session and never written to a file. If those notes resurface, they get added here with the same verdict vocabulary.",
} as const satisfies {
  chrome: string;
  heading: string;
  summary: readonly string[];
  totals: { checked: number; held: number; documented: number };
  accounts: readonly HandCheckAccount[];
  undocumentedNote: string;
};
