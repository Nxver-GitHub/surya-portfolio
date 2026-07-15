import type { Photo } from "../../../content/photos";
import { PhotoTile } from "./PhotoTile";

/** Reserved "not yet developed" frames shown per category section. */
const MAX_PLACEHOLDERS_PER_SECTION = 2;

/**
 * Column-based masonry gallery. Uses CSS multi-columns so tiles of varying
 * aspect ratios pack tightly without JS layout — each tile sets
 * `break-inside-avoid`. Server-renderable; no client state.
 *
 * Placeholder ("not yet developed") frames are capped at
 * MAX_PLACEHOLDERS_PER_SECTION so an empty category reads as a darkroom
 * mid-roll rather than a wall of identical dropzones. Real photos are
 * never capped — the roster in content/photos.ts still holds every
 * reserved slot for when content lands.
 */
export function PhotoGrid({ photos }: { photos: readonly Photo[] }) {
  if (photos.length === 0) {
    return (
      <p className="ts-hard mt-6 font-display text-sm font-bold tracking-widest text-silver uppercase">
        No frames in this category yet.
      </p>
    );
  }

  let placeholdersSeen = 0;
  const shown = photos.filter((photo) => {
    if (!photo.placeholder) return true;
    placeholdersSeen += 1;
    return placeholdersSeen <= MAX_PLACEHOLDERS_PER_SECTION;
  });

  let placeholderIndex = 0;

  return (
    <div className="mt-6 columns-1 gap-4 sm:columns-2 lg:columns-3">
      {shown.map((photo) => (
        <PhotoTile
          key={photo.id}
          photo={photo}
          rollIndex={photo.placeholder ? placeholderIndex++ : undefined}
        />
      ))}
    </div>
  );
}
