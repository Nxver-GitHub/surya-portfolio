/**
 * Site update log, newest release first. Surfaced by the VERSION plate in the
 * home footer (VersionLog). `changelog[0].version` is the site's displayed
 * version — bump it here and add an entry when shipping a visitor-visible
 * feature. Keep change lines short (one line each) and in plain English.
 */
export interface ChangelogEntry {
  readonly version: string;
  readonly date: string;
  readonly changes: readonly string[];
}

export const changelog: readonly ChangelogEntry[] = [
  {
    version: "1.0",
    date: "July 2026",
    changes: [
      "World map opens with all seven pavilions",
      "Garage: hero cars in 3D with full spec sheets",
      "Career: three seasons of events and results",
      "License Center and Missions, backed by evidence",
      "GT Café: 3D exhibit room, menu books, and a guest terminal",
      "Scapes darkroom ready for the first photo roll",
      "GT2-style boot intro with a press-start gate",
      "CRT screen effect and sound engine — see Options",
    ],
  },
];

export const siteVersion = changelog[0].version;
