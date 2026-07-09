/**
 * Missions: time-boxed competitions and challenges, grouped in packs.
 * Cross-links: carId → Garage, careerEventSlug → Career.
 */
export type MissionStamp = "CLEARED" | "IN PROGRESS" | "RETIRED";

export interface Mission {
  id: string;
  name: string;
  host: string;
  date: string;
  objective: string;
  constraints: readonly string[];
  outcome: string;
  stamp: MissionStamp;
  carId?: string;
  careerEventSlug?: string;
  logo?: string;
}

export interface MissionPack {
  id: string;
  name: string;
  description: string;
  missions: readonly Mission[];
}

export const missionPacks: readonly MissionPack[] = [
  {
    id: "competition-series",
    name: "Competition Series",
    description:
      "Hackathons and pitch competitions — every entry so far has finished on the podium.",
    missions: [
      {
        id: "cruzhacks-2025",
        name: "CruzHacks 2025",
        host: "CruzHacks, UC Santa Cruz",
        date: "Apr 2025",
        objective:
          "Build a platform matching students to federal, state, and nonprofit aid programs they'd otherwise never find.",
        constraints: ["36 hours", "First major hackathon", "Team build"],
        outcome:
          "Best Beginner Hack — later featured by Santa Cruz Works as 1 of 5 winning projects with startup potential.",
        stamp: "CLEARED",
        carId: "benefitfinder",
        careerEventSlug: "benefitfinder-cruzhacks",
        logo: "/logos/cruzhacks.png",
      },
      {
        id: "slugai-pitch-2025",
        name: "SlugAI Tech Startup Pitch Competition",
        host: "SlugAI, UC Santa Cruz",
        date: "Feb 2025",
        objective:
          "Pitch ClientSight: eye-tracking that reveals where users actually look, with AI generating and optimizing components around real attention patterns.",
        constraints: [
          "Pitch format — startup, not just a demo",
          "Team of 3: Surya Pugazhenthi, Glenn-Grant Richards, Jaisuraj Kaleeswaran",
        ],
        outcome: "1st place — $500 prize.",
        stamp: "CLEARED",
        carId: "clientsight",
        logo: "/logos/slugai.png",
      },
      {
        id: "locus-agentic-payments",
        name: "Locus Agentic Payments Hackathon",
        host: "Locus (Y Combinator FW25)",
        date: "Nov 2025",
        objective:
          "Build an autonomous agent that books business travel end-to-end and pays for it with real rails.",
        constraints: [
          "Agent must transact autonomously",
          "Stripe + x402-protocol stablecoins for cross-border micropayments",
        ],
        outcome: "2nd place overall + Stripe Prize Track.",
        stamp: "CLEARED",
        carId: "tripweaver",
        careerEventSlug: "tripweaver-locus",
        logo: "/logos/locus.png",
      },
      {
        id: "ef-marketing-agents",
        name: "EF Marketing Agents Hackathon",
        host: "Entrepreneur First",
        date: "Apr 2026",
        objective:
          "Build a B2B prospect-intelligence platform scoring trust and fit from live web signals.",
        constraints: [
          "Marketing-agents theme",
          "Real-time scraping via Apify, normalized into live scoring",
        ],
        outcome: "3rd place — Best Use of Apify API.",
        stamp: "CLEARED",
        carId: "credence",
        careerEventSlug: "credence-ef-hackathon",
        logo: "/logos/ef.png",
      },
    ],
  },
];

export const missionById = new Map(
  missionPacks.flatMap((p) => p.missions.map((m) => [m.id, m] as const)),
);
