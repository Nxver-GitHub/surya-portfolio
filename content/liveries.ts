/**
 * Livery-inspired color systems (no trademarks — colors and patterns only).
 * Each livery is a small palette used on component chrome: decal strips,
 * card edges, stamps. Names are internal shorthand for the reference livery.
 */
export type LiveryId =
  | "marlboro"
  | "gulf"
  | "west"
  | "jager"
  | "leyton"
  | "warsteiner"
  | "redbull"
  | "camel"
  | "rothmans"
  | "calsonic";

export interface Livery {
  /** Decal bar colors, rendered in order */
  bars: readonly string[];
  /** Dominant color for stamps/highlights on this component */
  key: string;
}

export const liveries: Record<LiveryId, Livery> = {
  /* white body, red chevron — the McLaren MP4 look */
  marlboro: { bars: ["#f4f2ef", "#d2222a"], key: "#d2222a" },
  /* powder blue + marigold — Le Mans endurance icon */
  gulf: { bars: ["#8bc0e2", "#f58020"], key: "#8bc0e2" },
  /* black/silver/red — late-90s F1 tobacco minimalism */
  west: { bars: ["#c8ccd2", "#d2222a", "#191b1e"], key: "#c8ccd2" },
  /* burnt orange on deep green-black — DRM/DTM cult classic */
  jager: { bars: ["#e56a19", "#20351f"], key: "#e56a19" },
  /* mint aqua — early-90s F1 one-off */
  leyton: { bars: ["#6fcabb", "#2a6f8e"], key: "#6fcabb" },
  /* gold script on black — group C / DTM beer livery */
  warsteiner: { bars: ["#c9a54a", "#f4f2ef"], key: "#c9a54a" },
  /* navy + yellow + red energy */
  redbull: { bars: ["#26346b", "#ffcf00", "#d2222a"], key: "#ffcf00" },
  /* desert yellow — period rally/F1 */
  camel: { bars: ["#fab217", "#1c1a17"], key: "#fab217" },
  /* navy/white/gold — the 959's Paris-Dakar-winning colors */
  rothmans: { bars: ["#20356f", "#f4f2ef", "#c9a54a"], key: "#5b7fd4" },
  /* process blue + white — JGTC Group A Skyline icon */
  calsonic: { bars: ["#0064b4", "#f4f6f8", "#003c78"], key: "#1e82d2" },
};
