/**
 * Online Lobby content: contact & communities, framed as a multiplayer
 * lobby. Room info + status chips + join controls + a player list of the
 * real communities/orgs pulled from career.ts. Copy tone: lobby metaphor
 * as chrome ("Join via LinkedIn"), facts in plain English.
 */

export interface LobbyRoom {
  name: string;
  region: string;
}

export interface StatusChip {
  label: string;
}

export type JoinChannel = "email" | "calendly" | "github" | "linkedin" | "x";

export interface JoinControl {
  channel: JoinChannel;
  label: string;
  href: string;
}

export interface PlayerCard {
  id: string;
  name: string;
  /** One-line plain-English description of the org/community */
  description: string;
  /**
   * Whether Surya is currently part of this community. Exactly ONE card is
   * "active" (16VC — owner call, 2026-07); everything else renders a FORMER
   * chip and reads in the past tense. Communities that only hosted a
   * hackathon/competition don't belong in this list at all.
   */
  membership: "active" | "former";
  link?: string;
  /** Cross-ref into Career Mode, rendered as /career/<slug> */
  careerEventSlug?: string;
}

export const lobbyRoom: LobbyRoom = {
  name: "Surya's Paddock",
  region: "Bay Area / Remote",
};

export const statusChips: readonly StatusChip[] = [
  { label: "Open to founder intros" },
  { label: "Exploring roles" },
  { label: "Open to hackathon teammates" },
];

export const joinControls: readonly JoinControl[] = [
  {
    channel: "email",
    label: "Email",
    href: "mailto:suryapugaz1629@gmail.com",
  },
  {
    channel: "calendly",
    label: "a call",
    href: "https://calendly.com/suryaoncall/surya-s-vc-scout-office-hours",
  },
  {
    channel: "github",
    label: "GitHub",
    href: "https://github.com/Nxver-GitHub",
  },
  {
    channel: "linkedin",
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/surya-pugazhenthi",
  },
  {
    channel: "x",
    label: "X",
    href: "https://x.com/surpugaz",
  },
] as const;

export const playerList: readonly PlayerCard[] = [
  {
    id: "16vc",
    name: "16VC",
    description:
      "Venture firm where Surya sources pre-seed and seed opportunities across the SF Bay Area.",
    membership: "active",
    careerEventSlug: "16vc",
  },
  {
    id: "lvlup-ventures",
    name: "LvlUp Ventures",
    description:
      "Shopline-backed seed fund where Surya previously scouted pre-seed and seed founders at demo days.",
    membership: "former",
    careerEventSlug: "lvlup-ventures",
  },
  {
    id: "venture-starters",
    name: "Venture Starters",
    description:
      "Educational internship where Surya previously ran live startup pitching sessions and investor Q&A.",
    membership: "former",
    careerEventSlug: "venture-starters",
  },
  {
    id: "ucsc",
    name: "UC Santa Cruz",
    description:
      "Where Surya earned his B.S. in Computer Science after transferring from community college.",
    membership: "former",
    careerEventSlug: "slugai-calendarize",
  },
  {
    id: "slugai",
    name: "SlugAI",
    description:
      "UCSC's AI innovation club, where Surya previously shipped Calendarize as a product developer.",
    membership: "former",
    careerEventSlug: "slugai-calendarize",
  },
  {
    id: "dvc",
    name: "Diablo Valley College",
    description:
      "Where Surya earned an A.S. in Computer Science and founded the Product Development Club.",
    membership: "former",
    careerEventSlug: "product-dev-club",
  },
] as const;
