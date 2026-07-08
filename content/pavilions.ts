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
  },
  {
    id: "garage",
    slug: "garage",
    name: "Garage",
    caption: "Projects, presented as cars",
    status: "locked",
    map: { x: 56, y: 23.2 },
    labelSide: "top",
  },
  {
    id: "license",
    slug: "license-center",
    name: "License Center",
    caption: "Skills, backed by proof",
    status: "locked",
    map: { x: 70.5, y: 42.3 },
    labelSide: "right",
  },
  {
    id: "missions",
    slug: "missions",
    name: "Missions",
    caption: "Hackathons & challenges",
    status: "locked",
    map: { x: 75, y: 60.7 },
    labelSide: "right",
  },
  {
    id: "scapes",
    slug: "scapes",
    name: "Scapes",
    caption: "Photography & interests",
    status: "locked",
    map: { x: 61.2, y: 85.7 },
    labelSide: "bottom",
  },
  {
    id: "cafe",
    slug: "cafe",
    name: "GT Café",
    caption: "Curated reading paths for founders & VCs",
    status: "locked",
    map: { x: 33, y: 89 },
    labelSide: "bottom",
  },
  {
    id: "lobby",
    slug: "lobby",
    name: "Online Lobby",
    caption: "Contact & communities",
    status: "locked",
    map: { x: 19.8, y: 67 },
    labelSide: "left",
  },
] as const;

export const openCount = pavilions.filter((p) => p.status === "open").length;
