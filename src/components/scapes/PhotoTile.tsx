import Image from "next/image";
import type { Photo } from "../../../content/photos";
import { crossLinksForPhoto } from "./crossLinks";
import { LinkChip } from "./LinkChip";
import { ViewfinderFrame } from "./ViewfinderFrame";

interface PhotoTileProps {
  photo: Photo;
  /**
   * Position of this tile among the placeholders shown in its category
   * section (0-based). Only set for `photo.placeholder` tiles — drives the
   * roll/frame-number captions so a capped section doesn't repeat "Roll 01"
   * twice. Ignored for real photos.
   */
  rollIndex?: number;
}

/**
 * One gallery tile. Real photos render as the GT photo-mode figure: an
 * image plus an info-plate that slides up on hover OR keyboard focus, with
 * the tile itself focusable and any cross-link chips reachable by tab.
 * Placeholder ("not yet developed") slots render a purely decorative,
 * non-interactive viewfinder frame instead — there is nothing to focus
 * into yet, so they are `aria-hidden` and out of the tab order.
 */
export function PhotoTile({ photo, rollIndex }: PhotoTileProps) {
  if (photo.placeholder) {
    const ordinal = String((rollIndex ?? 0) + 1).padStart(2, "0");
    return (
      <div className="mb-4 block break-inside-avoid">
        <ViewfinderFrame
          aspectRatio={`${photo.width} / ${photo.height}`}
          rollLabel={`Roll ${ordinal}`}
          frameNumber={`${ordinal}A`}
        />
      </div>
    );
  }

  const links = crossLinksForPhoto(photo);
  const metaLine = [photo.location, photo.date].filter(Boolean).join(" · ");

  return (
    <figure
      tabIndex={0}
      aria-label={photo.title}
      className="group relative mb-4 block break-inside-avoid overflow-hidden border border-steel bg-panel shadow-[2px_3px_0_rgba(0,0,0,0.7)] outline-none focus-visible:ring-2 focus-visible:ring-gt-bright"
    >
      <Image
        src={photo.src}
        alt={photo.title}
        width={photo.width}
        height={photo.height}
        unoptimized={photo.src.endsWith(".svg")}
        sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
        className="block h-auto w-full"
      />

      {/* Info-plate: revealed on hover or focus (opacity + translate, mech ease) */}
      <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-asphalt via-asphalt/90 to-transparent p-3 opacity-0 transition-[opacity,transform] duration-200 ease-mech group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 motion-reduce:transition-none">
        <h3 className="ts-hard font-display text-sm leading-tight font-bold tracking-wide text-chrome uppercase">
          {photo.title}
        </h3>
        {metaLine ? (
          <p className="mt-0.5 text-xs text-silver">{metaLine}</p>
        ) : null}
        {photo.caption ? (
          <p className="mt-1 text-xs text-silver/90">{photo.caption}</p>
        ) : null}
        {links.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {links.map((link) => (
              <LinkChip key={link.key} link={link} />
            ))}
          </div>
        ) : null}
      </figcaption>
    </figure>
  );
}
