/**
 * Scapes content: photography galleries, grouped into three categories.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PLACEHOLDER STATUS
 * ─────────────────────────────────────────────────────────────────────────
 * The Cars category ships real photography. Nature and Life entries are
 * still locally-generated GT-style "empty slot" placeholders (see
 * scripts/generate-scapes-placeholders.mjs); those titles/captions are
 * deliberately placeholder-flavored and make NO factual claims.
 *
 * Real photos must be re-encoded before landing in public/scapes/ — bake in
 * EXIF orientation, resize (~2000px long edge), and STRIP metadata (phone
 * JPEGs carry GPS; repo and site are public).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SWAP PROCEDURE — replacing a placeholder with a real photo (content-only)
 * ─────────────────────────────────────────────────────────────────────────
 *   1. Drop the real image file into `public/scapes/` (e.g. a .jpg or .webp).
 *      Prefer web-optimized files; next/image will optimize raster formats.
 *   2. Update the matching entry here:
 *        - point `src` at the new file (e.g. "/scapes/yosemite-dawn.jpg")
 *        - set `width` / `height` to the real pixel dimensions (aspect ratio
 *          drives the masonry layout — get these right)
 *        - write a real `title`, and optionally `location`, `date`, `caption`
 *        - REMOVE the `placeholder: true` flag
 *   3. That's it — no component or route changes. The gallery, hero banner,
 *      and cross-link chips are all data-driven off this file.
 *
 * Cross-refs (`carId` / `missionId` / `careerEventId`) MUST resolve against
 * real ids in content/cars.ts, content/missions.ts, content/career.ts. The
 * Scapes test suite enforces this.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type PhotoCategory = "nature" | "cars" | "life";

export interface Photo {
  id: string;
  /** Public path under /scapes/ */
  src: string;
  /** Intrinsic pixel width (drives layout aspect ratio) */
  width: number;
  /** Intrinsic pixel height */
  height: number;
  category: PhotoCategory;
  title: string;
  location?: string;
  /** Human-readable capture date */
  date?: string;
  caption?: string;
  /** Cross-ref: career event slug (content/career.ts) */
  careerEventId?: string;
  /** Cross-ref: mission id (content/missions.ts) */
  missionId?: string;
  /** Cross-ref: car / project id (content/cars.ts) */
  carId?: string;
  /** True while this is a generated stand-in, not real photography */
  placeholder?: true;
}

export interface CategoryMeta {
  id: PhotoCategory;
  /** Display name shown on the tab */
  name: string;
  /** One-line blurb for the hero banner */
  blurb: string;
  /** Photo id used as the category's featured hero image */
  featuredPhotoId: string;
}

export const categories: readonly CategoryMeta[] = [
  {
    id: "nature",
    name: "Nature",
    blurb: "Landscapes, light, and the outdoors — between the races.",
    featuredPhotoId: "nature-01",
  },
  {
    id: "cars",
    name: "Cars",
    blurb: "Machines that inspired the Garage — as seen in the metal.",
    featuredPhotoId: "cars-01",
  },
  {
    id: "life",
    name: "Life / Travel",
    blurb: "Places, people, and the paddock life around the work.",
    featuredPhotoId: "life-01",
  },
];

export const photos: readonly Photo[] = [
  /* ── Nature ─────────────────────────────────────────────────────────── */
  {
    id: "nature-01",
    src: "/scapes/nature-01.svg",
    width: 1600,
    height: 1067,
    category: "nature",
    title: "Reserved frame — landscape",
    location: "Location TBD",
    date: "Awaiting scan",
    caption: "Placeholder slot. A wide landscape will hang here once scanned.",
    placeholder: true,
  },
  {
    id: "nature-02",
    src: "/scapes/nature-02.svg",
    width: 1067,
    height: 1600,
    category: "nature",
    title: "Reserved frame — portrait",
    caption: "Placeholder slot for a tall nature shot (trees, falls, cliffs).",
    placeholder: true,
  },
  {
    id: "nature-03",
    src: "/scapes/nature-03.svg",
    width: 1200,
    height: 1200,
    category: "nature",
    title: "Reserved frame — square",
    date: "Awaiting scan",
    caption: "Placeholder slot. Square crop reserved for a detail study.",
    placeholder: true,
  },
  {
    id: "nature-04",
    src: "/scapes/nature-04.svg",
    width: 1600,
    height: 900,
    category: "nature",
    title: "Reserved frame — panorama",
    caption: "Placeholder slot for a wide panorama once the roll is developed.",
    placeholder: true,
  },

  /* ── Cars ───────────────────────────────────────────────────────────── */
  {
    id: "cars-01",
    src: "/scapes/gt3rs-speedvegas.jpg",
    width: 1500,
    height: 2000,
    category: "cars",
    title: "991 GT3 RS — SpeedVegas",
    location: "SpeedVegas, Las Vegas",
    date: "Summer 2025",
    caption:
      "Fun fact: I tracked this 991 GT3 RS at SpeedVegas in summer 2025. Wings like that are even better from the driver's seat.",
  },
  {
    id: "cars-02",
    src: "/scapes/ferrari-f1-transporter.jpg",
    width: 1500,
    height: 2000,
    category: "cars",
    title: "Ferrari F1, unloading",
    location: "Monterey Car Week",
    date: "August 2025",
    caption:
      "A 1990s Ferrari Formula 1 car coming off the transporter — Car Week logistics you don't see from the lawn.",
  },
  {
    id: "cars-03",
    src: "/scapes/mclaren-f1-rm-sothebys.jpg",
    width: 1500,
    height: 2000,
    category: "cars",
    title: "McLaren F1 — RM Sotheby's",
    location: "Monterey Car Week",
    date: "August 2025",
    caption: "Doors up at the RM Sotheby's auction preview.",
  },
  {
    id: "cars-04",
    src: "/scapes/porsche-959.jpg",
    width: 1500,
    height: 2000,
    category: "cars",
    title: "Porsche 959",
    location: "Monterey Car Week",
    date: "August 2025",
    caption:
      "A 959 casually parked outside the hotel. During Car Week this counts as street parking.",
  },
  {
    id: "cars-05",
    src: "/scapes/carweek-golden-hour.jpg",
    width: 1500,
    height: 2000,
    category: "cars",
    title: "Golden hour, wings up",
    location: "Monterey Car Week",
    date: "August 2025",
    caption: "McLarens on the coast at sunset to close out Car Week.",
  },

  /* ── Life / Travel ──────────────────────────────────────────────────── */
  {
    id: "life-01",
    src: "/scapes/life-01.svg",
    width: 1600,
    height: 1067,
    category: "life",
    title: "Reserved frame — on the road",
    caption:
      "Placeholder slot. Tagged to a race weekend on the Career timeline.",
    careerEventId: "tripweaver-locus",
    placeholder: true,
  },
  {
    id: "life-02",
    src: "/scapes/life-02.svg",
    width: 1067,
    height: 1600,
    category: "life",
    title: "Reserved frame — portrait",
    caption: "Placeholder slot for a tall travel frame.",
    placeholder: true,
  },
  {
    id: "life-03",
    src: "/scapes/life-03.svg",
    width: 1200,
    height: 1200,
    category: "life",
    title: "Reserved frame — square",
    date: "Awaiting scan",
    caption:
      "Placeholder slot. Square crop reserved for a hackathon candid, cross-linked to its mission.",
    missionId: "cruzhacks-2025",
    placeholder: true,
  },
  {
    id: "life-04",
    src: "/scapes/life-04.svg",
    width: 1600,
    height: 900,
    category: "life",
    title: "Reserved frame — wide",
    caption: "Placeholder slot for a wide travel panorama.",
    placeholder: true,
  },
];

export const photoById = new Map(photos.map((p) => [p.id, p] as const));

export const categoryById = new Map(
  categories.map((c) => [c.id, c] as const),
);

/** Photos in a category, in roster order. */
export function photosByCategory(category: PhotoCategory): readonly Photo[] {
  return photos.filter((p) => p.category === category);
}
