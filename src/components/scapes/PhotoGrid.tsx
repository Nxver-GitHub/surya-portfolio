import type { Photo } from "../../../content/photos";
import { PhotoTile } from "./PhotoTile";

/**
 * Column-based masonry gallery. Uses CSS multi-columns so tiles of varying
 * aspect ratios pack tightly without JS layout — each tile sets
 * `break-inside-avoid`. Server-renderable; no client state.
 */
export function PhotoGrid({ photos }: { photos: readonly Photo[] }) {
  if (photos.length === 0) {
    return (
      <p className="ts-hard mt-6 font-display text-sm font-bold tracking-widest text-silver uppercase">
        No frames in this category yet.
      </p>
    );
  }

  return (
    <div className="mt-6 columns-1 gap-4 sm:columns-2 lg:columns-3">
      {photos.map((photo) => (
        <PhotoTile key={photo.id} photo={photo} />
      ))}
    </div>
  );
}
