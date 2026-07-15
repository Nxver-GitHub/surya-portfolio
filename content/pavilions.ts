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
  /** Node position on the circuit map, in % of the map canvas */
  map: { x: number; y: number };
  /** Which side of the node the label sits on, to keep it clear of the ribbon */
  labelSide: "top" | "bottom" | "left" | "right";
  /** Livery-inspired decal system for this pavilion's chrome */
  livery: LiveryId;
  /** 1-3 char mark on the enamel badge (GT2 license-badge style) */
  glyph: string;
}

export const pavilions: readonly Pavilion[] = [
  {
    id: "career",
    slug: "career",
    name: "Career",
    caption: "Education & work, season by season",
    status: "open",
    map: { x: 15, y: 23.2 },
    labelSide: "bottom",
    livery: "marlboro",
    glyph: "CR",
  },
  {
    id: "garage",
    slug: "garage",
    name: "Garage",
    caption: "Projects, presented as cars",
    status: "open",
    map: { x: 56, y: 23.2 },
    labelSide: "top",
    livery: "gulf",
    glyph: "GR",
  },
  {
    id: "license",
    slug: "license-center",
    name: "License Center",
    caption: "Skills, backed by proof",
    status: "open",
    map: { x: 70.5, y: 42.3 },
    labelSide: "right",
    livery: "west",
    glyph: "LC",
  },
  {
    id: "missions",
    slug: "missions",
    name: "Missions",
    caption: "Hackathons & challenges",
    status: "open",
    map: { x: 75, y: 60.7 },
    labelSide: "right",
    livery: "jager",
    glyph: "MS",
  },
  {
    id: "scapes",
    slug: "scapes",
    name: "Scapes",
    caption: "Photography & interests",
    status: "locked",
    map: { x: 61.2, y: 85.7 },
    labelSide: "bottom",
    livery: "leyton",
    glyph: "SC",
  },
  {
    id: "cafe",
    slug: "cafe",
    name: "GT Café",
    caption: "Curated reading paths for founders & VCs",
    status: "open",
    map: { x: 33, y: 89 },
    labelSide: "bottom",
    livery: "warsteiner",
    glyph: "GT",
  },
  {
    id: "lobby",
    slug: "lobby",
    name: "Online Lobby",
    caption: "Contact & communities",
    status: "open",
    map: { x: 19.8, y: 67 },
    labelSide: "left",
    livery: "redbull",
    glyph: "OL",
  },
] as const;

export const openCount = pavilions.filter((p) => p.status === "open").length;
