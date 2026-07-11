/**
 * GT Café content: "Menu Books" — curated visitor journeys.
 *
 * Each book is a short reading path for a specific audience (founders, VCs,
 * hiring managers). A book's tasks each point at ONE real destination
 * elsewhere in the site via a typed, id-grounded link target. Those ids MUST
 * resolve against the real content files — the menu-books.test.ts suite fails
 * the build otherwise:
 *   - kind "career"   → eventSlug   in content/career.ts   (findEvent)
 *   - kind "garage"   → carId       in content/cars.ts      (carById)
 *   - kind "missions" → missionId?  in content/missions.ts  (missionById)
 *   - kind "scapes"   → category?   in content/photos.ts    (PhotoCategory)
 *   - kind "license"  → tierId?     in content/licenses.ts  (licenseById)
 *
 * Copy tone (per CLAUDE.md): the café / book metaphor is chrome. `label` is a
 * short race-flavored caption; `description` states the real, factual reason
 * to visit in plain English. No invented facts, orgs, dates, or claims.
 *
 * `anchor` is the 3D table position (in the cafe.glb's local space) that the
 * book's hotspot marker sits at. Values here are PLACEHOLDERS laid out on a
 * gentle arc around the café floor; the orchestrator updates them from the
 * real scene at integration.
 */

import type { LicenseTierId } from "./licenses";
import type { PhotoCategory } from "./photos";

/** GT7-style book families: a themed collection, a head-to-head, or a one-off. */
export type BookType = "collection" | "tournament" | "misc";

/** Where a task sends the visitor — one real destination, typed by pavilion. */
export type TaskTarget =
  | { kind: "career"; eventSlug: string }
  | { kind: "garage"; carId: string }
  | { kind: "missions"; missionId?: string }
  | { kind: "scapes"; category?: PhotoCategory }
  | { kind: "license"; tierId?: LicenseTierId };

/** A 3D anchor point in the café scene's local coordinate space. */
export interface BookAnchor {
  x: number;
  y: number;
  z: number;
}

/**
 * Enamel spine treatment for a book, so each audience reads as a distinct
 * object across the room and in the hover UI. Colors harmonize with the site's
 * livery palettes (see content/liveries.ts) but are hardcoded here — a book's
 * cover is content, not a livery entry.
 */
export interface BookCover {
  /** Enamel body color as a `#rrggbb` hex — distinct per book. */
  color: string;
  /** 1–2 char spine mark, mirroring the world-map badge glyphs. */
  glyph: string;
  /** Short audience tag for the hover/label UI, e.g. "FOR FOUNDERS". */
  label: string;
}

/** One stop on a reading path. */
export interface MenuBookTask {
  id: string;
  /** Short, race-flavored caption for the stop */
  label: string;
  /** Plain-English fact — why this stop is worth the visitor's time */
  description: string;
  /** The single real destination this task links to */
  target: TaskTarget;
}

/** A curated reading path for one audience. */
export interface MenuBook {
  id: string;
  type: BookType;
  /** In-universe book title (metaphor as chrome) */
  title: string;
  /** Plain-English audience — who this path is for */
  audience: string;
  /** One-line framing of what the path covers */
  blurb: string;
  /** 2–5 stops, in reading order */
  tasks: readonly MenuBookTask[];
  /** 3D table position the book's marker sits at (placeholder coords) */
  anchor: BookAnchor;
  /** Enamel spine treatment — color, glyph, and audience tag for the UI. */
  cover: BookCover;
}

export const menuBooks: readonly MenuBook[] = [
  /* ── Collection: the agent-building thread ──────────────────────────── */
  {
    id: "agent-collection",
    type: "collection",
    title: "The Agent Collection",
    audience: "For founders building with AI agents",
    blurb:
      "Three projects where an autonomous agent does the work end-to-end — booking travel, sourcing prospects, and matching students to aid — plus the skill class that certifies it.",
    tasks: [
      {
        id: "agent-tripweaver",
        label: "Lead car — TripWeaver",
        description:
          "An autonomous business-travel agent that books a full trip and pays for it with real rails. 2nd overall plus the Stripe prize at the Locus Agentic Payments Hackathon.",
        target: { kind: "garage", carId: "tripweaver" },
      },
      {
        id: "agent-credence",
        label: "Support car — Credence",
        description:
          "A B2B prospect-intelligence agent scoring trust and fit from live web signals. 3rd place and Best Use of Apify at the EF Marketing Agents Hackathon.",
        target: { kind: "garage", carId: "credence" },
      },
      {
        id: "agent-benefitfinder",
        label: "Privateer — BenefitFinder",
        description:
          "Matches students to federal, state, and nonprofit aid programs they'd never find on their own. Best Beginner Hack at CruzHacks 2025.",
        target: { kind: "garage", carId: "benefitfinder" },
      },
      {
        id: "agent-license",
        label: "Scrutineering — IA class",
        description:
          "The Intermediate-A license: the AI-agents skill tier, where each test links back to the project that proves it.",
        target: { kind: "license", tierId: "IA" },
      },
    ],
    anchor: { x: -4.2, y: 0.98, z: 0 },
    cover: { color: "#8bc0e2", glyph: "AG", label: "FOR FOUNDERS" },
  },

  /* ── Tournament: two hackathon builds, head to head ─────────────────── */
  {
    id: "hackathon-tournament",
    type: "tournament",
    title: "Hackathon Grand Prix",
    audience: "For engineers judging how he builds under time pressure",
    blurb:
      "Two podium hackathon builds set side by side — the same 36-hour discipline, two different problem spaces — with the mission cards that scored them.",
    tasks: [
      {
        id: "tournament-tripweaver-car",
        label: "Grid 1 — TripWeaver",
        description:
          "The payments-rails build: agentic travel booking with Stripe and stablecoin micropayments, shipped at the Locus hackathon.",
        target: { kind: "garage", carId: "tripweaver" },
      },
      {
        id: "tournament-tripweaver-mission",
        label: "Grid 1 result sheet",
        description:
          "The Locus Agentic Payments mission card: objective, constraints, and the 2nd-overall-plus-Stripe-prize outcome.",
        target: { kind: "missions", missionId: "locus-agentic-payments" },
      },
      {
        id: "tournament-benefitfinder-car",
        label: "Grid 2 — BenefitFinder",
        description:
          "The public-good build: an aid-matching platform for students, shipped in 36 hours at CruzHacks 2025.",
        target: { kind: "garage", carId: "benefitfinder" },
      },
      {
        id: "tournament-benefitfinder-mission",
        label: "Grid 2 result sheet",
        description:
          "The CruzHacks 2025 mission card: Best Beginner Hack, later featured by Santa Cruz Works as one of five winning projects with startup potential.",
        target: { kind: "missions", missionId: "cruzhacks-2025" },
      },
    ],
    anchor: { x: -2.97, y: 0.98, z: 2.33 },
    cover: { color: "#e56a19", glyph: "GP", label: "FOR ENGINEERS" },
  },

  /* ── Collection: the venture / founder-side thread ──────────────────── */
  {
    id: "venture-collection",
    type: "collection",
    title: "The Venture Table",
    audience: "For VCs and operators",
    blurb:
      "The founder-side track: sourcing and diligence work at venture programs, and the skill class that certifies it.",
    tasks: [
      {
        id: "venture-16vc",
        label: "Paddock pass — 16VC",
        description:
          "Deal sourcing and diligence support inside a venture program — the founder-side of the table, not just the builder-side.",
        target: { kind: "career", eventSlug: "16vc" },
      },
      {
        id: "venture-lvlup",
        label: "Team principal — LvlUp Ventures",
        description:
          "Venture work at LvlUp Ventures on the timeline, framed as a season event with the deep-dive story.",
        target: { kind: "career", eventSlug: "lvlup-ventures" },
      },
      {
        id: "venture-license",
        label: "Scrutineering — S class",
        description:
          "The Super license: the venture / founder-side skill tier — scouting pipelines, sourcing, and pitch-and-Q&A, each linked to the work that earned it.",
        target: { kind: "license", tierId: "S" },
      },
    ],
    anchor: { x: 0, y: 0.82, z: 3.3 },
    cover: { color: "#20356f", glyph: "VT", label: "FOR VCS & OPERATORS" },
  },

  /* ── Misc: the GT7 "Scapes book" — send visitors to photography ─────── */
  {
    id: "scapes-misc",
    type: "misc",
    title: "Off the Clock",
    audience: "For anyone who wants the human behind the work",
    blurb:
      "A short detour off the racing line: the Scapes photo galleries and the everyday interests around the projects.",
    tasks: [
      {
        id: "scapes-cars",
        label: "Pit lane — Cars",
        description:
          "The Cars gallery in Scapes: the machines that inspired the Garage, as seen in the metal.",
        target: { kind: "scapes", category: "cars" },
      },
      {
        id: "scapes-nature",
        label: "Scenic route — Nature",
        description:
          "The Nature gallery: landscapes and light from between the races.",
        target: { kind: "scapes", category: "nature" },
      },
      {
        id: "scapes-life",
        label: "Paddock life — Life & Travel",
        description:
          "The Life gallery: places, people, and the paddock life around the work.",
        target: { kind: "scapes", category: "life" },
      },
    ],
    anchor: { x: 2.97, y: 0.98, z: 2.33 },
    cover: { color: "#6fcabb", glyph: "OC", label: "OFF THE CLOCK" },
  },

  /* ── Misc: the fast start — one lap for a busy hiring manager ───────── */
  {
    id: "recruiter-misc",
    type: "misc",
    title: "The Quick Lap",
    audience: "For hiring managers short on time",
    blurb:
      "One lap of the essentials: the flagship shipped product, the license board that maps skills to proof, and the résumé event that anchors the timeline.",
    tasks: [
      {
        id: "recruiter-nodegent",
        label: "Flagship — Nodegent",
        description:
          "The AI-powered UCSC student dashboard: a full production build that pulls a campus into one desktop.",
        target: { kind: "garage", carId: "nodegent" },
      },
      {
        id: "recruiter-license",
        label: "Skill board — full grid",
        description:
          "The License Center: skills as classes B through S, each test graded and linked to the project, competition, or role that earned it.",
        target: { kind: "license" },
      },
      {
        id: "recruiter-career",
        label: "Grid start — Product Dev Club",
        description:
          "The earliest anchor on the Career timeline — where the building habit started, told as a season event.",
        target: { kind: "career", eventSlug: "product-dev-club" },
      },
    ],
    anchor: { x: 4.2, y: 0.98, z: 0 },
    cover: { color: "#d2222a", glyph: "QL", label: "THE QUICK LAP" },
  },
] as const;

/** Fast lookup by book id. */
export const menuBookById: ReadonlyMap<string, MenuBook> = new Map(
  menuBooks.map((b) => [b.id, b] as const),
);

/** All book types, for iteration and validation. */
export const bookTypeOrder: readonly BookType[] = [
  "collection",
  "tournament",
  "misc",
] as const;

/** Plain-English label for a book type, shown on the book cover plate. */
export function bookTypeLabel(type: BookType): string {
  switch (type) {
    case "collection":
      return "Collection";
    case "tournament":
      return "Tournament";
    case "misc":
      return "Miscellaneous";
  }
}

/**
 * Resolve a task target to the visitor-facing route it links to.
 * Route conventions match the existing pavilions:
 *   garage → /garage?car=<id>, scapes → /scapes?cat=<cat>,
 *   license → /license-center?tier=<id>, career → /career/<slug>,
 *   missions → /missions (list; optional id kept for future deep-links).
 */
export function taskHref(target: TaskTarget): string {
  switch (target.kind) {
    case "career":
      return `/career/${target.eventSlug}`;
    case "garage":
      return `/garage?car=${target.carId}`;
    case "missions":
      return "/missions";
    case "scapes":
      return target.category ? `/scapes?cat=${target.category}` : "/scapes";
    case "license":
      return target.tierId
        ? `/license-center?tier=${target.tierId}`
        : "/license-center";
  }
}
