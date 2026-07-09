import type { LiveryId } from "./liveries";

/**
 * Garage content: projects as cars.
 * - hero: has (or will have this sprint) a 3D model
 * - silhouette: browsable specs, greyed thumbnail, "3D model in production"
 * - locked: stealth project — no specs, "coming soon" only
 */
export type CarStatus = "hero" | "silhouette" | "locked";

export type CarClass =
  | "GT1 Hackathon Special"
  | "Production Class"
  | "Concept Car"
  | "Classic";

export interface Car {
  id: string;
  /** Project name — the "make/model" */
  name: string;
  /** Inspired-by chassis, e.g. "F1 GTR Longtail–inspired" (undefined while unrevealed) */
  chassis?: string;
  carClass?: CarClass;
  status: CarStatus;
  livery: LiveryId;
  /** One-line description */
  tagline?: string;
  /** Performance — impact metrics */
  performance?: readonly string[];
  /** Drivetrain — tech stack */
  drivetrain?: readonly string[];
  /** Lap record — headline result / live status */
  lapRecord?: string;
  /** Year/period raced */
  raced?: string;
  links?: readonly { label: string; href: string }[];
  /** Career event slug for "View Replay" */
  careerEventSlug?: string;
  /** Mission id if born at a competition */
  missionId?: string;
  team?: readonly { name: string; role: string }[];
  media?: {
    video?: { src: string; note?: string };
    deck?: { src: string; label: string };
    photos?: readonly { src: string; caption: string }[];
  };
  /** glTF model path once the Blender model lands */
  modelPath?: string;
}

export const cars: readonly Car[] = [
  {
    id: "nodegent",
    name: "Nodegent",
    chassis: "Porsche 959–inspired",
    carClass: "Production Class",
    status: "hero",
    livery: "rothmans",
    tagline:
      "AI-powered student dashboard for UCSC — your campus in one desktop.",
    performance: [
      "Replaces 4–6 daily tools (Canvas, MyUCSC, Google Calendar, campus sites) with one dashboard",
      "Saves the 30–60 min/day students burn on context-switching",
      "Full audit log + instant revoke on every AI action",
      "Built across 8 one-week scrum sprints as a 4-person team",
    ],
    drivetrain: [
      "Next.js",
      "Convex",
      "Clerk",
      "Canvas API",
      "Google Calendar API",
      "Groq LLM (server-side)",
      "Playwright",
    ],
    lapRecord: "Live at nodegent.app — CSE 115A, Spring 2026",
    raced: "Spring 2026",
    links: [
      { label: "Live demo", href: "https://nodegent.app" },
      { label: "View code", href: "https://github.com/Nxver-GitHub/Nodegent" },
    ],
    team: [
      { name: "Surya Pugazhenthi", role: "Product Owner & Lead Developer" },
      { name: "Rafe Abdulali", role: "Developer" },
      { name: "Josh Parra", role: "Developer" },
      { name: "Niserg Desai", role: "Developer" },
    ],
    media: {
      video: {
        src: "/projects/nodegent/demo-2.5x.mp4",
        note: "Demo shown at 2.5× speed",
      },
      deck: {
        src: "/projects/nodegent/nodegent-final-presentation.pptx",
        label: "Final presentation deck",
      },
    },
  },
  {
    id: "tripweaver",
    name: "TripWeaver",
    chassis: "McLaren F1 GTR Longtail–inspired",
    carClass: "GT1 Hackathon Special",
    status: "hero",
    livery: "marlboro",
    tagline:
      "Autonomous business-travel agent with real payment rails.",
    performance: [
      "End-to-end trip booking handled by an autonomous agent",
      "Cross-border micropayments via Stripe + x402-protocol stablecoins",
      "2nd place overall + Stripe Prize Track at a YC-company hackathon",
    ],
    drivetrain: [
      "Claude Agent SDK",
      "Stripe API",
      "Next.js / Vercel",
      "Kiwi Travel MCP",
      "Coinbase",
      "Locus Crypto Wallet",
    ],
    lapRecord: "2nd overall + Stripe Prize — Locus Agentic Payments, Nov 2025",
    raced: "Nov 2025",
    careerEventSlug: "tripweaver-locus",
    missionId: "locus-agentic-payments",
  },
  {
    id: "credence",
    name: "Credence",
    chassis: "Mercedes CLK GTR–inspired",
    carClass: "GT1 Hackathon Special",
    status: "hero",
    livery: "west",
    tagline:
      "B2B prospect intelligence scoring trust and fit from the live web.",
    performance: [
      "Real-time web scraping normalized into a live scoring dashboard",
      "Configurable signal weighting across high-stakes industries",
      "Connection-graph visualization of prospect networks",
    ],
    drivetrain: ["React + Vite", "Supabase", "Apify"],
    lapRecord: "3rd place, Best Use of Apify API — EF Hackathon, Apr 2026",
    raced: "Apr 2026",
    careerEventSlug: "credence-ef-hackathon",
    missionId: "ef-marketing-agents",
  },
  {
    id: "benefitfinder",
    name: "BenefitFinder",
    chassis: "Ferrari F40 LM–inspired",
    carClass: "GT1 Hackathon Special",
    status: "hero",
    livery: "jager",
    tagline:
      "Matches students to aid programs they'd never find on their own.",
    performance: [
      "Matching across 20+ eligibility criteria, built in 36 hours",
      "Gemini AI semantic search across federal, state, and nonprofit programs",
      "Featured by Santa Cruz Works as 1 of 5 projects with startup potential",
    ],
    drivetrain: ["Vite + React", "Firebase", "Gemini AI"],
    lapRecord: "Best Beginner Hack — CruzHacks, Apr 2025",
    raced: "Apr 2025",
    careerEventSlug: "benefitfinder-cruzhacks",
    missionId: "cruzhacks-2025",
  },
  {
    id: "calendarize",
    name: "Calendarize",
    carClass: "Production Class",
    status: "silhouette",
    livery: "leyton",
    tagline: "AI-powered calendar tool, launched on Product Hunt.",
    performance: [
      "Serverless analytics pipeline capturing 100% of user interactions",
      "Retention & funnel dashboards drove weekly prioritization",
      "Public Product Hunt launch with early-adopter feedback loop",
    ],
    drivetrain: ["Next.js", "PostHog", "Product research → PRD → launch"],
    lapRecord: "Shipped — Product Hunt launch, Spring 2025",
    raced: "Jan – Jun 2025",
    links: [{ label: "Live demo", href: "https://calendarize.ratcliff.cc/" }],
    careerEventSlug: "slugai-calendarize",
  },
  {
    id: "clientsight",
    name: "ClientSight",
    carClass: "GT1 Hackathon Special",
    status: "silhouette",
    livery: "warsteiner",
    tagline:
      "Eye-tracking reveals where users actually look; AI optimizes components around real attention.",
    performance: [
      "Attention patterns from eye-tracking, not click heatmaps",
      "AI generates and optimizes components to boost retention & engagement",
      "1st place ($500) at SlugAI's tech startup pitch competition",
    ],
    drivetrain: ["Eye-tracking", "AI component generation"],
    lapRecord: "1st place — SlugAI Pitch Competition, Feb 2025",
    raced: "Feb 2025",
    missionId: "slugai-pitch-2025",
    team: [
      { name: "Surya Pugazhenthi", role: "Co-founder" },
      { name: "Glenn-Grant Richards", role: "Co-founder" },
      { name: "Jaisuraj Kaleeswaran", role: "Co-founder" },
    ],
  },
  {
    id: "slugspace",
    name: "slugspace",
    carClass: "Concept Car",
    status: "silhouette",
    livery: "redbull",
    tagline: "Tinder-style roommate matching for UCSC students.",
    performance: [
      "Swipe-based matching with saved searches and student profiles",
      "Shown at UCSC project showcases",
    ],
    drivetrain: ["React Native", "Mobile app development"],
    lapRecord: "Working prototype — 2024–25 season",
    raced: "Oct 2024 – Apr 2025",
    links: [
      {
        label: "View code",
        href: "https://github.com/Nxver-GitHub/Roommate-Finder-GDG",
      },
    ],
    careerEventSlug: "slugspace",
  },
  {
    id: "ainfinitetunes",
    name: "AInfiniteTunes",
    carClass: "Classic",
    status: "silhouette",
    livery: "camel",
    tagline:
      "Music player with an AI recommendation engine — the Project Bracket era build.",
    performance: [
      "AI recommendations across similar artists and genres",
      "Led as Web Dev PM with a student team",
    ],
    drivetrain: ["Web app", "AI recommendations"],
    lapRecord: "Shipped — Project Bracket, Fall 2023",
    raced: "Aug – Dec 2023",
    careerEventSlug: "project-bracket",
  },
  {
    id: "stealth",
    name: "???",
    status: "locked",
    livery: "west",
  },
];

export const carById = new Map(cars.map((c) => [c.id, c]));
export const garageCarIds = new Set(
  cars.filter((c) => c.status !== "locked").map((c) => c.id),
);
