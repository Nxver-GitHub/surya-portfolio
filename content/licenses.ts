/**
 * License Center content: skills as GT2 license tiers, each backed by proof.
 *
 * The ladder runs in GT order B → A → IB → IA → S. Class R sits BESIDE that
 * ladder rather than above it: it certifies a different discipline (GTM
 * engineering), so nothing in B → S is a prerequisite for it and it is not
 * the ladder's top rung.
 *
 * Every test's grade is an honest self-assessment; evidence is a typed
 * cross-reference into real Garage cars (`carId`), Missions (`missionId`),
 * Career events (`careerEventId`), or Special Stage case studies
 * (`specialStageSlug`). Those ids MUST resolve against content/cars.ts,
 * content/missions.ts, content/career.ts, and content/gtme.ts — the
 * licenses.test.ts suite fails the build otherwise.
 *
 * Copy tone (per CLAUDE.md): the racing metaphor is chrome. `name` is a short
 * race-flavored label; `summary` states the real, factual accomplishment in
 * plain English. No invented orgs, dates, or outcomes.
 */

import type { StageSlug } from "./gtme";
import type { LiveryId } from "./liveries";

/** GT2 license grades: enamel/metallic medal, or an honest in-progress state. */
export type LicenseGrade = "gold" | "silver" | "bronze" | "inprogress";

/** Canonical GT license order — do not reorder. */
export type LicenseTierId = "B" | "A" | "IB" | "IA" | "S" | "R";

/**
 * One license test: a single competency, graded, with optional evidence
 * pointing at the real project / competition / role that proves it.
 */
export interface LicenseTest {
  id: string;
  /** Short, race-flavored label */
  name: string;
  /** Plain-English, factual summary of the competency and its proof */
  summary: string;
  grade: LicenseGrade;
  /** Garage car id (content/cars.ts) */
  carId?: string;
  /** Mission id (content/missions.ts) */
  missionId?: string;
  /** Career event slug (content/career.ts) */
  careerEventId?: string;
  /** Special Stage case study slug (content/gtme.ts) */
  specialStageSlug?: StageSlug;
}

/** A license tier: a themed group of tests. */
export interface License {
  id: LicenseTierId;
  /** Race-flavored tier label */
  name: string;
  /** Plain-English theme — the skill area this tier certifies */
  theme: string;
  /** One-line framing of what earning this license means */
  summary: string;
  /** Livery-inspired accent for this tier's chrome (badge rim / stripe) */
  livery: LiveryId;
  /** External credential backing this tier (content/credentials.ts) */
  credentialId?: string;
  tests: readonly LicenseTest[];
}

export const licenses: readonly License[] = [
  {
    id: "B",
    name: "Class B — Core Web",
    theme: "HTML / CSS / TypeScript / React fundamentals",
    summary:
      "The rookie license: shipping real front-end interfaces with React, TypeScript, and modern CSS.",
    livery: "west",
    tests: [
      {
        id: "b-react-web-app",
        name: "First laps in React",
        summary:
          "Built BenefitFinder's matching UI with Vite + React in 36 hours at CruzHacks — a React web app shipped under real time pressure.",
        grade: "silver",
        carId: "benefitfinder",
        careerEventId: "benefitfinder-cruzhacks",
      },
      {
        id: "b-react-native-mobile",
        name: "React on mobile",
        summary:
          "Built slugspace, a React Native app with swipe-based matching, saved searches, and student profiles — React component skills carried onto native.",
        grade: "silver",
        carId: "slugspace",
        careerEventId: "slugspace",
      },
      {
        id: "b-typescript-nextjs-ui",
        name: "Typed, production UI",
        summary:
          "Designed, prototyped, and iterated the Calendarize UI in a Next.js/React codebase — TypeScript React components in a shipped product.",
        grade: "gold",
        carId: "calendarize",
        careerEventId: "slugai-calendarize",
      },
    ],
  },
  {
    id: "A",
    name: "Class A — Full-stack Shipping",
    theme: "Next.js apps, APIs, and deployment",
    summary:
      "Full-stack license: building and deploying complete Next.js products with real back-end integrations.",
    livery: "west",
    tests: [
      {
        id: "a-nodegent-fullstack",
        name: "Ship it live",
        summary:
          "Led Nodegent as Product Owner and lead developer — a Next.js + Convex + Clerk student dashboard integrating Canvas and Google Calendar APIs, running live at nodegent.app.",
        grade: "gold",
        carId: "nodegent",
      },
      {
        id: "a-analytics-pipeline",
        name: "Telemetry to launch",
        summary:
          "Built a serverless analytics pipeline for Calendarize (Next.js API route → PostHog) capturing every interaction, then launched the product on Product Hunt.",
        grade: "gold",
        carId: "calendarize",
        careerEventId: "slugai-calendarize",
      },
      {
        id: "a-benefitfinder-36h",
        name: "36-hour full build",
        summary:
          "Built BenefitFinder end-to-end in 36 hours — Vite + React front end, Firebase auth and real-time database, matching across 20+ eligibility criteria — winning Best Beginner Hack at CruzHacks.",
        grade: "gold",
        carId: "benefitfinder",
        missionId: "cruzhacks-2025",
        careerEventId: "benefitfinder-cruzhacks",
      },
      {
        id: "a-cloudflare-migration",
        name: "Engine swap under green",
        summary:
          "Migrated this live Next.js site from Vercel to Cloudflare Workers via OpenNext with zero downtime, rebuilding the edge layer — HSTS, a TLS 1.3 floor, rate limiting on the admin login, WAF rules, and the 308 redirect map across two zones — behind a verified DNS-level rollback and a CI gate that builds the real Worker.",
        grade: "gold",
        carId: "racing-portfolio",
      },
    ],
  },
  {
    id: "IB",
    name: "Class IB — WebGL / Three.js",
    theme: "React Three Fiber and 3D web pipelines",
    summary:
      "Real-time 3D on the web with React Three Fiber and a Blender-to-glTF asset pipeline (International B).",
    livery: "west",
    tests: [
      {
        id: "ib-r3f-scenes",
        name: "3D on the grid",
        summary:
          "Built this site's 3D in React Three Fiber: the GT Café museum room, the garage's inspectable hero cars, and the boot-intro montage — lazy-loaded scenes, camera rigs, and data-bound spec sheets, live in production.",
        grade: "gold",
        carId: "racing-portfolio",
      },
      {
        id: "ib-gltf-pipeline",
        name: "Blender to glTF",
        summary:
          "Runs the Blender → meshopt-compressed glTF → gltfjsx pipeline behind the café and garage: lighting baked in Blender, exports validated, models landing as typed R3F components.",
        grade: "silver",
        carId: "racing-portfolio",
      },
    ],
  },
  {
    id: "IA",
    name: "Class IA — AI Agents & Orchestration",
    theme: "Agent systems and LLM applications",
    summary:
      "International A: designing autonomous agents and LLM-backed applications that take real actions.",
    livery: "west",
    tests: [
      {
        id: "ia-autonomous-agent",
        name: "Autonomous transaction",
        summary:
          "Built TripWeaver on the Claude Agent SDK — an autonomous business-travel agent that books trips end-to-end and pays with real rails — winning 2nd overall + the Stripe Prize at the Locus hackathon.",
        grade: "gold",
        carId: "tripweaver",
        missionId: "locus-agentic-payments",
        careerEventId: "tripweaver-locus",
      },
      {
        id: "ia-prospect-intelligence",
        name: "Signals into scores",
        summary:
          "Built Credence, a B2B prospect-intelligence platform scoring trust and fit from live web signals via real-time scraping — 3rd place, Best Use of Apify API at the EF Marketing Agents hackathon.",
        grade: "silver",
        carId: "credence",
        missionId: "ef-marketing-agents",
        careerEventId: "credence-ef-hackathon",
      },
      {
        id: "ia-guarded-llm-actions",
        name: "LLM actions, audited",
        summary:
          "Wired server-side Groq LLM actions into Nodegent with a full audit log and instant revoke on every AI action — LLM automation with a human-in-control safety layer.",
        grade: "silver",
        carId: "nodegent",
      },
      {
        id: "ia-semantic-search",
        name: "Semantic matching",
        summary:
          "Used Gemini AI for semantic search across federal, state, and nonprofit programs in BenefitFinder, matching students to aid across 20+ eligibility criteria.",
        grade: "bronze",
        carId: "benefitfinder",
        missionId: "cruzhacks-2025",
      },
    ],
  },
  {
    id: "S",
    name: "Class S — Venture / Thesis",
    theme: "Venture scouting and investment thinking",
    summary:
      "Sourcing and evaluating early-stage startups, and forming investment theses (Super License).",
    livery: "west",
    tests: [
      {
        id: "s-scout-pipeline",
        name: "Sourcing pipeline",
        summary:
          "As a Venture Scout at LvlUp Ventures, ran founder outreach as an instrumented pipeline — 20+ personalized outreaches into 10 founder calls, surfacing 3 companies for potential investment.",
        grade: "gold",
        careerEventId: "lvlup-ventures",
      },
      {
        id: "s-16vc-sourcing",
        name: "Pre-seed sourcing",
        summary:
          "As a Venture Associate at 16VC, sourcing and evaluating pre-seed and seed opportunities across the SF Bay Area through demo days, founder outreach, and the builder community.",
        grade: "silver",
        careerEventId: "16vc",
      },
      {
        id: "s-pitch-and-qa",
        name: "Reps in the room",
        summary:
          "Building investment judgment through Venture Starters — live startup pitching sessions and investor Q&A — reps that sharpen how startups get evaluated.",
        grade: "bronze",
        careerEventId: "venture-starters",
      },
      {
        id: "s-founder-side",
        name: "Founder's seat",
        summary:
          "Pitched ClientSight — an eye-tracking attention-analytics startup — to a 1st-place, $500 win at the SlugAI Tech Startup Pitch Competition, seeing the venture case from the founder's side.",
        grade: "silver",
        carId: "clientsight",
        missionId: "slugai-pitch-2025",
      },
    ],
  },
  {
    id: "R",
    name: "Rally License — GTM Engineering",
    theme: "Go-to-market systems: signal detection, segmentation, and outbound",
    summary:
      "The rally license: building go-to-market systems for markets the standard tools cannot see, where the buying signal is an absence and the identity layer has to be built underneath the platform.",
    livery: "subaru555",
    credentialId: "alphaforge-gtme",
    tests: [
      {
        id: "r-absence-detection",
        name: "Recon in the dark",
        summary:
          "Ran a payment-processor detection scan across 2,932 YC companies, with cost and distribution predicted before the run and the result landing within five rows of the estimate — built on a four-state detection design so that \"we looked and found nothing\" never reads as \"this input is unset\".",
        grade: "gold",
        specialStageSlug: "recon",
      },
      {
        id: "r-snapshot-memory",
        name: "A clock for Clay",
        summary:
          "Built a Supabase snapshot layer that diffs each vendor fingerprint against its prior observation and posts classified change events back into the table, giving a platform that only knows what is true now the ability to answer what changed — with reason-code guards so a failed scan can never masquerade as a removal.",
        grade: "gold",
        specialStageSlug: "recon",
      },
      {
        id: "r-segmentation-handcheck",
        name: "Pace notes, hand-checked",
        summary:
          "Cut 909 scored accounts into segments and hand-checked 30 of them against the segment's own claim, then renamed the segment when the name asserted more than the scan had actually observed.",
        grade: "silver",
        specialStageSlug: "pace-notes",
      },
      {
        id: "r-outbound-loop",
        name: "Twelve signed sends",
        summary:
          "Sent 12 fully personalized, signed emails behind an Apps Script reply loop that finds a labelled thread, strips the quoted text, classifies it and lands it back in the table in under 60 seconds — with the manual reply join published as a known limitation rather than hidden.",
        grade: "silver",
        specialStageSlug: "the-stage",
      },
    ],
  },
];

/** Canonical tier order for iteration and validation. */
export const licenseTierOrder: readonly LicenseTierId[] = [
  "B",
  "A",
  "IB",
  "IA",
  "S",
  "R",
] as const;

export const licenseById: ReadonlyMap<LicenseTierId, License> = new Map(
  licenses.map((l) => [l.id, l] as const),
);

/** Every test across all tiers, flattened (useful for lookups and tests). */
export const allLicenseTests: readonly LicenseTest[] = licenses.flatMap(
  (l) => l.tests,
);
