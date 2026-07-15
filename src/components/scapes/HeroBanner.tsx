import Image from "next/image";
import type { CategoryMeta, Photo } from "../../../content/photos";
import type { LiveryId } from "../../../content/liveries";
import { LiveryStripe } from "../livery/LiveryStripe";

interface HeroBannerProps {
  category: CategoryMeta;
  featured: Photo;
  livery: LiveryId;
}

/**
 * Category hero strip: the featured frame on the left, the category name +
 * blurb on the right, with the pavilion's livery decal along the top edge.
 */
export function HeroBanner({ category, featured, livery }: HeroBannerProps) {
  return (
    <section
      aria-label={`${category.name} — featured`}
      className="relative mt-8 overflow-hidden border border-steel bg-panel shadow-[2px_3px_0_rgba(0,0,0,0.7)]"
    >
      <LiveryStripe livery={livery} className="absolute inset-x-0 top-0" />

      <div className="grid gap-0 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="relative aspect-[16/9] bg-asphalt md:aspect-auto">
          <Image
            src={featured.src}
            alt={featured.title}
            width={featured.width}
            height={featured.height}
            unoptimized={featured.src.endsWith(".svg")}
            sizes="(min-width: 768px) 55vw, 100vw"
            priority
            className="h-full w-full object-cover"
          />
          {featured.placeholder ? (
            <span className="ts-hard absolute top-4 left-3 border border-steel bg-asphalt/80 px-2 py-0.5 font-display text-xs font-black tracking-widest text-silver uppercase">
              Placeholder
            </span>
          ) : null}
        </div>

        <div className="flex flex-col justify-center gap-2 p-5 md:p-6">
          <p className="ts-hard font-display text-xs font-semibold tracking-[0.25em] text-silver uppercase">
            Featured
          </p>
          <h2 className="ts-hard font-display text-2xl leading-tight font-bold tracking-wide text-chrome uppercase">
            {category.name}
          </h2>
          <p className="text-sm text-silver">{category.blurb}</p>
        </div>
      </div>
    </section>
  );
}
