/**
 * Career Mode content: seasons → events → deep-dive stories.
 * Facts in plain English; game labels (Track/Team/Stint/Result) are
 * captions only. carIds/missionIds reference future Garage/Missions
 * content and render as locked chips until those pavilions ship.
 */

export interface CareerEvent {
  slug: string;
  title: string;
  /** Track — organization or program */
  org: string;
  /** Team — role/title */
  role: string;
  /** Stint — dates, human-readable */
  dates: string;
  /** Result — the headline outcome, one line */
  result: string;
  /** Deep-dive story */
  story: {
    problem: string;
    actions: readonly string[];
    results: string;
  };
  links?: readonly { label: string; href: string }[];
  /** Future Garage cars (locked chips until Garage ships) */
  carIds?: readonly string[];
  /** Future Missions (locked chips until Missions ships) */
  missionIds?: readonly string[];
}

export interface Season {
  id: string;
  /** e.g. "Season 1" */
  number: string;
  name: string;
  period: string;
  /** One-line season framing */
  summary: string;
  events: readonly CareerEvent[];
}

export const seasons: readonly Season[] = [
  {
    id: "s1",
    number: "Season 1",
    name: "Diablo Valley",
    period: "2022 – 2024",
    summary:
      "Rookie season at Diablo Valley College: first shipped software, first leadership laps, and an A.S. in Computer Science.",
    events: [
      {
        slug: "product-dev-club",
        title: "Founding Product Development Club",
        org: "Diablo Valley College",
        role: "Founder & President",
        dates: "Aug – Dec 2023",
        result: "First product-focused club on campus; 30+ active members in one semester",
        story: {
          problem:
            "DVC had CS clubs that taught code, but nowhere for students to learn how real products get scoped, designed, and shipped.",
          actions: [
            "Founded the college's first product-focused club and built its curriculum around shipping real projects, not just tutorials.",
            "Grew a community of students across technology, business, and design; social following grew 300% before the first meeting.",
            "Ran general and officer meetings, and secured a guest-speaker event with the Project Director of Codify Berkeley on software consulting and product strategy.",
          ],
          results:
            "30+ active members in a single semester and a durable template for product education at DVC — the clearest early signal that building communities around builders is its own product.",
        },
      },
      {
        slug: "project-bracket",
        title: "Three stints at Project Bracket",
        org: "Project Bracket, DVC",
        role: "Team Member → ML Project Manager → Web Dev Project Manager",
        dates: "Sep 2022 – Dec 2023",
        result: "Shipped an Android campus app, an ML stock predictor, and AInfiniteTunes across three project cycles",
        story: {
          problem:
            "Project Bracket ran semester-long team builds; each cycle demanded a bigger role — contributor, then PM of an ML team, then PM of a web team.",
          actions: [
            "Built back-end features in Kotlin for a digital campus community Android app supporting coursework collaboration and academic assistance.",
            "Led a team building an ML-driven stock market prediction model on the Polygon.io Stocks API, teaching applied ML and investment analytics along the way.",
            "Led development of AInfiniteTunes, a music player web app with a built-in AI recommendation system for discovering songs across similar artists and genres.",
          ],
          results:
            "Three shipped team projects and the jump from contributor to project manager twice over — the season where leading teams became the default.",
        },
        carIds: ["ainfinitetunes"],
      },
      {
        slug: "code-for-your-future",
        title: "Code for Your Future",
        org: "Code for Your Future, DVC",
        role: "VP of Growth & Strategy",
        dates: "Aug – Dec 2023",
        result: "Shaped long-term vision and prepared members for CS exams, internships, and interviews",
        story: {
          problem:
            "A CS-focused club needed direction: members wanted concrete progress toward internships and interviews, not just meetings.",
          actions: [
            "Owned long-term vision, direction, and initiatives as a principal officer.",
            "Organized meeting objectives and prepared instructional material for coding sessions.",
            "Focused programming on equipping members for CS exams, internship applications, and technical interviews.",
          ],
          results:
            "A structured club program pointed at real outcomes, run in parallel with founding PDC — two leadership laps in the same semester.",
        },
      },
      {
        slug: "puma-stem-scholars",
        title: "NSF Puma STEM Scholars",
        org: "DVC Puma STEM Scholars (NSF-funded)",
        role: "Student Representative",
        dates: "Sep 2022 – May 2023",
        result: "Represented students in an NSF program improving STEM transfer outcomes",
        story: {
          problem:
            "Community-college STEM students transfer at low rates; the NSF-funded program built learning communities to change that.",
          actions: [
            "Participated in the research and scholarship program as a student representative.",
            "Helped develop the learning-community structures the program studied.",
          ],
          results:
            "Contributed to a program aimed at exactly the path taken next: a successful STEM transfer to UC Santa Cruz.",
        },
      },
    ],
  },
  {
    id: "s2",
    number: "Season 2",
    name: "UC Santa Cruz",
    period: "2024 – 2026",
    summary:
      "Promotion to the B.S. grid at UCSC: first hackathon win, first real product cycle with analytics, first mobile app with users to find.",
    events: [
      {
        slug: "slugai-calendarize",
        title: "Calendarize at SlugAI",
        org: "SlugAI — UCSC's AI innovation club",
        role: "Product Developer",
        dates: "Jan – Jun 2025",
        result: "Launched an AI calendar tool on Product Hunt with a full analytics pipeline behind it",
        story: {
          problem:
            "Calendarize — an AI-powered calendar tool built by a student team — needed product direction grounded in evidence, not vibes.",
          actions: [
            "Defined product vision and strategy through user interviews and market research; authored the PRD and user-story backlog.",
            "Designed, prototyped, and iterated the UI/UX.",
            "Implemented a serverless analytics pipeline (Next.js API route → PostHog) capturing 100% of user interactions, synthesized into retention and funnel dashboards used in weekly prioritization.",
            "Coordinated design, engineering, and marketing to launch on Product Hunt and fold early-adopter feedback into positioning and roadmap.",
          ],
          results:
            "A shipped, instrumented product with a public launch — the first full product cycle from research to telemetry to release.",
        },
        links: [{ label: "Live demo", href: "https://calendarize.ratcliff.cc/" }],
        carIds: ["calendarize"],
      },
      {
        slug: "benefitfinder-cruzhacks",
        title: "BenefitFinder wins at CruzHacks",
        org: "CruzHacks 2025",
        role: "Full-stack builder",
        dates: "Apr 2025",
        result: "Best Beginner Hack; featured by Santa Cruz Works as 1 of 5 winning projects with startup potential",
        story: {
          problem:
            "Students eligible for federal, state, and nonprofit aid routinely never find it — eligibility rules are scattered across dozens of programs.",
          actions: [
            "Built an MVP in 36 hours matching students to aid programs across 20+ eligibility criteria.",
            "Implemented the matching engine with Vite + React, Firebase auth and real-time DB, and Gemini AI for semantic search across aid programs.",
          ],
          results:
            "Won Best Beginner Hack and got featured at Santa Cruz Works' 2025 Summer Rooftop Mixer as one of five hackathon projects with startup potential — the first race win.",
        },
        carIds: ["benefitfinder"],
        missionIds: ["cruzhacks-2025"],
      },
      {
        slug: "slugspace",
        title: "slugspace",
        org: "Independent, UCSC",
        role: "Mobile developer",
        dates: "Oct 2024 – Apr 2025",
        result: "A React Native roommate-matching app for UCSC students",
        story: {
          problem:
            "UCSC students hunt for roommates through chaotic group chats and spreadsheets.",
          actions: [
            "Built a mobile app with Tinder-style swiping for roommate matching, saved searches, and student profiles using React Native.",
          ],
          results:
            "A working mobile product and a deep lap on native app development — later showcased at UCSC project showcases.",
        },
        carIds: ["slugspace"],
      },
    ],
  },
  {
    id: "s3",
    number: "Season 3",
    name: "Venture & Agents",
    period: "2025 – Present",
    summary:
      "The factory-team era: building agentic systems at hackathons while scouting founders for three venture firms.",
    events: [
      {
        slug: "16vc",
        title: "16VC",
        org: "16VC",
        role: "Venture Associate",
        dates: "Jun 2026 – Present",
        result: "Sourcing pre-seed and seed opportunities across the SF Bay Area ecosystem",
        story: {
          problem:
            "Early-stage funds live or die on seeing great founders before everyone else.",
          actions: [
            "Source and evaluate pre-seed and seed-stage investment opportunities across the SF Bay Area through demo days, founder outreach, and the hackathon and builder community.",
          ],
          results:
            "The current stint: a builder inside the venture machine, using the hackathon circuit as a sourcing edge.",
        },
      },
      {
        slug: "credence-ef-hackathon",
        title: "Credence at EF Marketing Agents Hackathon",
        org: "Entrepreneur First",
        role: "Full-stack builder",
        dates: "Apr 2026",
        result: "3rd place, Best Use of Apify API",
        story: {
          problem:
            "High-stakes industries need to know which prospects to trust — signals are scattered across the live web.",
          actions: [
            "Built a B2B prospect-intelligence platform scoring trust and fit using real-time web scraping and configurable signal weighting.",
            "Architected the pipeline with React + Vite, Supabase real-time queries, and Apify scraping normalized into a live scoring dashboard with connection-graph visualization.",
          ],
          results:
            "Placed 3rd for Best Use of Apify API in a field of marketing-agent builds.",
        },
        carIds: ["credence"],
        missionIds: ["ef-marketing-agents"],
      },
      {
        slug: "lvlup-ventures",
        title: "LvlUp Ventures",
        org: "LvlUp Ventures (Shopline-backed seed fund)",
        role: "Venture Scout",
        dates: "Feb 2026 – Present",
        result: "3 companies surfaced for potential investment from 20+ founder outreaches",
        story: {
          problem:
            "Seed funds need scouts embedded where strong technical founders actually show up first.",
          actions: [
            "Sourced and evaluated pre-seed and seed founders at demo days including Afore Capital's Spring 2026 Showcase and PearX W26, focusing on B2B software and AI infrastructure.",
            "Drafted personalized outreach to 20+ founders (Coverflow, Polarity, Hilt, Hexagon, Clayzo among them) and converted 10 conversations into founder calls.",
          ],
          results:
            "Secured 3 companies for potential investment — outreach as a repeatable, instrumented pipeline.",
        },
      },
      {
        slug: "venture-starters",
        title: "Venture Starters",
        org: "Venture Starters",
        role: "Venture Analyst Intern",
        dates: "Jan 2026 – Present",
        result: "Hands-on reps in live startup pitching and investor Q&A",
        story: {
          problem:
            "Evaluating startups well requires reps — hearing real pitches and real investor questioning, repeatedly.",
          actions: [
            "Participating in Venture Starters' educational internship: live, virtual startup pitching sessions and investor Q&A.",
          ],
          results:
            "A steady training ground running alongside active scout work at LvlUp and 16VC.",
        },
      },
      {
        slug: "tripweaver-locus",
        title: "TripWeaver at Locus Agentic Payments Hackathon",
        org: "Locus (Y Combinator FW25)",
        role: "Agent systems builder",
        dates: "Nov 2025",
        result: "2nd place overall + Stripe Prize Track",
        story: {
          problem:
            "Business travel booking is a multi-step, multi-vendor workflow — a natural fit for an autonomous agent with real payment rails.",
          actions: [
            "Built an autonomous business-travel agent handling end-to-end trip booking with cross-border micropayments via Stripe and x402-protocol stablecoins.",
            "Composed the stack from the Claude Agent SDK, Stripe API, Vercel/Next.js, Kiwi Travel MCP, Coinbase, and Locus Crypto Wallet.",
          ],
          results:
            "Won 2nd place and the Stripe Prize Track — the race that pulled the venture world and agent engineering onto the same track.",
        },
        carIds: ["tripweaver"],
        missionIds: ["locus-agentic-payments"],
      },
    ],
  },
];

export function findEvent(slug: string) {
  for (const season of seasons) {
    const event = season.events.find((e) => e.slug === slug);
    if (event) return { season, event };
  }
  return null;
}

export const allEventSlugs = seasons.flatMap((s) =>
  s.events.map((e) => e.slug),
);
