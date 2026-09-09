import type { LiveryId } from "./liveries";

export type PavilionStatus = "open" | "locked";

export interface Pavilion {
  id: string;
  slug: string;
  /** In-universe section name (metaphor as chrome) */
  name: string;
  /** Plain-English caption — what this actually is */
  caption: string;
  status: PavilionStatus;
  /**
   * Where this destination's label sits on the terrain image, as a % of the
   * map canvas. Anchored to the landmark drawn in the art, so it moves only
   * when the terrain is regenerated.
   */
  map: { x: number; y: number };
  /** Livery-inspired decal system for this pavilion's chrome */
  livery: LiveryId;
  /** 1-3 char mark on the enamel badge (GT2 license-badge style) */
  glyph: string;
}

export const pavilions: readonly Pavilion[] = [
  // GT Café leads: the mobile list ranks by visitor intent (the start-here
  // plate above it points cold visitors at the Café's guided menus), while
  // the desktop map places nodes purely by coordinates.
  {
    id: "cafe",
    slug: "cafe",
    name: "GT Café",
    caption: "Curated reading paths for founders & VCs",
    status: "open",
    map: { x: 43, y: 57 },
    livery: "warsteiner",
    glyph: "GT",
  },
  {
    id: "career",
    slug: "career",
    name: "Career",
    caption: "Education & work, season by season",
    status: "open",
    map: { x: 18, y: 22 },
    livery: "marlboro",
    glyph: "CR",
  },
  {
    id: "garage",
    slug: "garage",
    name: "Garage",
    caption: "Projects, presented as cars",
    status: "open",
    map: { x: 64, y: 12 },
    livery: "gulf",
    glyph: "GR",
  },
  {
    id: "license",
    slug: "license-center",
    name: "License Center",
    caption: "Skills, backed by proof",
    status: "open",
    map: { x: 83, y: 33 },
    livery: "west",
    glyph: "LC",
  },
  {
    id: "missions",
    slug: "missions",
    name: "Missions",
    caption: "Hackathons & challenges",
    status: "open",
    map: { x: 84, y: 51 },
    livery: "jager",
    glyph: "MS",
  },
  {
    id: "rally",
    slug: "special-stage",
    name: "Special Stage",
    caption: "GTM engineering case studies",
    status: "open",
    map: { x: 88, y: 65 },
    livery: "subaru555",
    glyph: "SS",
  },
  {
    id: "scapes",
    slug: "scapes",
    name: "Scapes",
    caption: "Photography & interests",
    status: "locked",
    map: { x: 64, y: 79 },
    livery: "leyton",
    glyph: "SC",
  },
  {
    id: "lobby",
    slug: "lobby",
    name: "Online Lobby",
    caption: "Contact & communities",
    status: "open",
    map: { x: 17, y: 46 },
    livery: "redbull",
    glyph: "OL",
  },
] as const;

export const openCount = pavilions.filter((p) => p.status === "open").length;
