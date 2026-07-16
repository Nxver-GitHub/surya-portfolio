import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface OgFont {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: "normal";
}

let cachedFonts: OgFont[] | null = null;

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}

/**
 * Loads the TTF bytes satori needs to render OG/icon images.
 *
 * The page's self-hosted fonts (fonts.ts) are woff2 — ImageResponse/satori
 * only parses ttf, otf, and woff — so these are separate self-hosted TTF
 * copies of the same two families (Source Serif 4 Bold, Saira Regular),
 * checked into src/fonts alongside the woff2 originals. Cached at module
 * scope: opengraph-image/icon routes are statically optimized by default, so
 * this read happens once per build rather than per request.
 */
export async function loadOgFonts(): Promise<OgFont[]> {
  if (cachedFonts) return cachedFonts;
  const dir = join(process.cwd(), "src/fonts");
  const [serifBold, sairaRegular] = await Promise.all([
    readFile(join(dir, "SourceSerif4-Bold-OG.ttf")),
    readFile(join(dir, "Saira-Regular-OG.ttf")),
  ]);
  cachedFonts = [
    {
      name: "Source Serif 4",
      data: toArrayBuffer(serifBold),
      weight: 700,
      style: "normal",
    },
    {
      name: "Saira",
      data: toArrayBuffer(sairaRegular),
      weight: 400,
      style: "normal",
    },
  ];
  return cachedFonts;
}

let cachedSerifFont: OgFont | null = null;

/** Just the serif title face — used by the small icon/apple-icon routes. */
export async function loadSerifFont(): Promise<OgFont> {
  if (cachedSerifFont) return cachedSerifFont;
  const path = join(process.cwd(), "src/fonts", "SourceSerif4-Bold-OG.ttf");
  const data = await readFile(path);
  cachedSerifFont = {
    name: "Source Serif 4",
    data: toArrayBuffer(data),
    weight: 700,
    style: "normal",
  };
  return cachedSerifFont;
}
