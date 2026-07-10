"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  categories,
  categoryById,
  photoById,
  photosByCategory,
  type PhotoCategory,
} from "../../../content/photos";
import type { LiveryId } from "../../../content/liveries";
import { CategoryTabs } from "./CategoryTabs";
import { HeroBanner } from "./HeroBanner";
import { PhotoGrid } from "./PhotoGrid";

const VALID = new Set<PhotoCategory>(categories.map((c) => c.id));

function toCategory(raw: string | null): PhotoCategory {
  return raw && VALID.has(raw as PhotoCategory)
    ? (raw as PhotoCategory)
    : categories[0].id;
}

/**
 * Scapes gallery browser. The URL (`?cat=`) is the single source of truth, so
 * back/forward and deep links stay in sync — the same pattern the Garage uses.
 */
export function ScapesBrowser({ livery }: { livery: LiveryId }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const active = toCategory(searchParams.get("cat"));
  const meta = categoryById.get(active) ?? categories[0];
  const gallery = photosByCategory(active);
  const featured = photoById.get(meta.featuredPhotoId) ?? gallery[0];

  const select = (id: PhotoCategory) => {
    if (id !== active) {
      router.replace(`/scapes?cat=${id}`, { scroll: false });
    }
  };

  return (
    <div>
      <CategoryTabs categories={categories} active={active} onSelect={select} />

      <div
        role="tabpanel"
        id={`scapes-panel-${active}`}
        aria-labelledby={`scapes-tab-${active}`}
      >
        {featured ? (
          <HeroBanner category={meta} featured={featured} livery={livery} />
        ) : null}
        <PhotoGrid photos={gallery} />
      </div>
    </div>
  );
}
