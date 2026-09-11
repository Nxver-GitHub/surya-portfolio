/**
 * The menu playlist and its attribution.
 *
 * These are facts about somebody else's work, so they live in content/ with
 * the rest of the real-world data rather than being inlined next to the audio
 * engine. The credit is not decoration: CC BY 4.0 requires the title, the
 * author, a link to the source, a link to the licence, and a note of what was
 * changed, and the Options panel renders exactly that from this file.
 */

export interface MusicTrack {
  /** Path under public/, served from our own origin (the CSP has no hosts). */
  readonly src: string;
  /** The composer's title for the track, spelled their way. */
  readonly title: string;
}

/**
 * One rotation, site-wide. Deliberately NOT assigned per destination — a
 * continuous playlist that ignores where you are keeps the site feeling like
 * one console session rather than seven themed rooms.
 *
 * These are the pack's `seamless_loop` versions: they are cut to end where
 * they begin, so the join between tracks lands on a musical edge instead of a
 * fade-out tail.
 */
export const musicPlaylist: readonly MusicTrack[] = [
  { src: "/audio/short-circuit.m4a", title: "Short Circuit" },
  { src: "/audio/jungle-jargon.m4a", title: "Jungle Jargon" },
  { src: "/audio/activez-les-plaisir.m4a", title: "Activez les Plaisir" },
  { src: "/audio/midnight-trial.m4a", title: "Midnight Trial" },
  { src: "/audio/sunset-relay.m4a", title: "Sunset Relay" },
];

/** Everything CC BY 4.0 obliges us to show, as plain facts. */
export const musicCredit = {
  packTitle: "PS1-Era Inspired Jungle / Drum & Bass Music Pack",
  /** The title as it fits in the Options panel, which is 208px wide. */
  shortTitle: "PS1-Era Jungle/DnB Pack",
  author: "elevchyt",
  sourceUrl:
    "https://elevchyt.itch.io/ps1-era-inspired-jungledrum-bass-music-pack-free",
  licenseName: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  /** What we changed, which the licence also requires us to state. */
  changes: "re-encoded",
} as const;
