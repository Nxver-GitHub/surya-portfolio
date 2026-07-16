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
    version: "1.4",
    date: "July 2026",
    changes: [
      "Controller mode: tap an arrow key anywhere — D-pad selection, Enter to confirm, Backspace to go back",
      "GT2 screen wipes between pavilions — forward slides left, back slides right",
      "NOW LOADING screens with rotating tips on the 3D routes",
    ],
  },
  {
    version: "1.3",
    date: "July 2026",
    changes: [
      "License Center rebuilt as a trophy wall — every medal is one line linking into the work that earned it",
      "Garage spec sheets now wear their earned licenses",
      "This site joins its own dealership: Class IB (WebGL / Three.js) earned, evidence — the car you're driving",
    ],
  },
  {
    version: "1.2",
    date: "July 2026",
    changes: [
      "Book a call: Calendly office hours in the Online Lobby, from the café terminal, and via the Garage's new open bay",
      "Garage: an empty dealer slot invites collaborating on the next project",
    ],
  },
  {
    version: "1.1",
    date: "July 2026",
    changes: [
      "Scapes: first real photo roll — fourteen Cars frames, from SpeedVegas to Monterey Car Week to the Singapore GP",
      "GT Café origin revealed: inspired by Motoring Coffee, SF — see the note on the café page, or ask the terminal",
      "New profile photo across the site, license-card style",
    ],
  },
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
