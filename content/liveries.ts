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
  | "calsonic"
  | "jps"
  | "fina"
  | "ferrari"
  | "martini"
  | "silkcut"
  | "alitalia"
  | "subaru555"
  | "repsol"
  | "gauloises"
  | "benetton";

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
  /* black + gold — the John Player Special Lotus 72/79 */
  jps: { bars: ["#0b0b0b", "#c9a24a"], key: "#c9a24a" },
  /* deep blue + red + yellow — the BMW/McLaren F1 GTR endurance racer */
  fina: { bars: ["#12305f", "#d81f26", "#f4c20d"], key: "#2f6bc0" },
  /* rosso corsa + white — the scarlet F1 works team */
  ferrari: { bars: ["#c8102e", "#f4f2ef", "#111111"], key: "#c8102e" },
  /* white + navy/light-blue/red stripe set — the endurance & rally classic */
  martini: { bars: ["#f4f2ef", "#1b2a5e", "#3aa0dc", "#c8102e"], key: "#2f5fae" },
  /* lavender + white — the Group C Jaguar sports-prototype */
  silkcut: { bars: ["#8a6db0", "#f4f2ef"], key: "#8a6db0" },
  /* white + green + red — the Group 4 rally Stratos tricolore */
  alitalia: { bars: ["#f4f2ef", "#0a7d3c", "#d2222a"], key: "#0a7d3c" },
  /* rally blue + yellow — the 90s WRC Impreza */
  subaru555: { bars: ["#1256b8", "#f4c20d"], key: "#1256b8" },
  /* orange + white + blue — the works enduro/GP factory colors */
  repsol: { bars: ["#f26722", "#f4f2ef", "#1b3a8c"], key: "#f26722" },
  /* French racing blue gradient + white — the Ligier/Peugeot period look */
  gauloises: { bars: ["#5aa0d6", "#1b3a6b", "#f4f2ef"], key: "#5aa0d6" },
  /* multicolour on white — the United-Colours 90s F1 team */
  benetton: { bars: ["#00a651", "#0072ce", "#f4c20d", "#e2231a"], key: "#00a651" },
};
