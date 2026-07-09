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
    video?: { src: string; poster?: string; note?: string };
    deck?: { src: string; label: string };
    photos?: readonly { src: string; caption: string }[];
  };
  /** glTF model path once the Blender model lands */
  modelPath?: string;
  /** Attribution for third-party 3D models (CC-BY etc.) — rendered under the 3D scene */
  modelCredit?: {
    title: string;
    author: string;
    /** e.g. "Sketchfab" */
    source: string;
    url: string;
    /** e.g. "CC BY 4.0" */
    license: string;
    licenseUrl?: string;
  };
}

export const cars: readonly Car[] = [
  {
    id: "nodegent",
    name: "Nodegent",
    chassis: "Porsche 911 Carrera 4S (993)",
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
        poster: "/projects/nodegent/demo-poster.jpg",
        note: "Demo shown at 2.5× speed",
      },
      deck: {
        src: "/projects/nodegent/nodegent-final-presentation.pptx",
        label: "Final presentation deck",
      },
    },
    modelPath: "/models/nodegent.glb",
    modelCredit: {
      title: "1996 Porsche 993 Carrera 4S",
      author: "s0h1o9b",
      source: "Sketchfab",
      url: "https://sketchfab.com/3d-models/1996-porsche-993-carrera-4s-5d90416b06854a369e566d3fa286c692",
      license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    },
  },
  {
    id: "tripweaver",
    name: "TripWeaver",
    chassis: "McLaren F1 LM",
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
    modelPath: "/models/tripweaver.glb",
    modelCredit: {
      title: "McLaren F1LM – Low Poly",
      author: "Ajay Gawde",
      source: "Sketchfab",
      url: "https://sketchfab.com/3d-models/mclaren-f1lm-low-poly-ed54b4bab2cc4d31a13a2fce89d8e9e2",
      license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    },
  },
  {
    id: "credence",
    name: "Credence",
    chassis: "Mercedes-Benz CLK GTR",
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
    modelPath: "/models/credence.glb",
    modelCredit: {
      title: "TOON: Mercedez Benz CLK GTR",
      author: "LePoint_BAT",
      source: "Sketchfab",
      url: "https://sketchfab.com/3d-models/toon-mercedez-benz-clk-gtr-004f277bc51e432d81770a3d348c8d98",
      license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    },
  },
  {
    id: "benefitfinder",
    name: "BenefitFinder",
    chassis: "Nissan Skyline GT-R (R32)",
    carClass: "GT1 Hackathon Special",
    status: "hero",
    livery: "calsonic",
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
    modelPath: "/models/benefitfinder.glb",
    modelCredit: {
      title: "Nissan Skyline R32 GTR",
      author: "Blue3D",
      source: "Sketchfab",
      url: "https://sketchfab.com/3d-models/nissan-skyline-r32-gtr-e2a16f567a7e4d0ab99c0bd6460ba396",
      license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    },
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
