"use client";

import { useRef } from "react";
import type { CategoryMeta, PhotoCategory } from "../../../content/photos";

interface CategoryTabsProps {
  categories: readonly CategoryMeta[];
  active: PhotoCategory;
  onSelect: (id: PhotoCategory) => void;
}

/**
 * Segmented control over the three categories, built to the ARIA tabs pattern:
 * one tab in the tab order at a time (roving tabindex), Left/Right/Home/End
 * move focus and select. Styled with the GT plate / plate-hot vocabulary.
 */
export function CategoryTabs({
  categories,
  active,
  onSelect,
}: CategoryTabsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusTab = (index: number) => {
    const next = (index + categories.length) % categories.length;
    tabRefs.current[next]?.focus();
    onSelect(categories[next].id);
  };

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        focusTab(index + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        focusTab(index - 1);
        break;
      case "Home":
        event.preventDefault();
        focusTab(0);
        break;
      case "End":
        event.preventDefault();
        focusTab(categories.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Photo categories"
      className="mt-8 flex flex-wrap gap-2"
    >
      {categories.map((category, index) => {
        const isActive = category.id === active;
        return (
          <button
            key={category.id}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={`scapes-tab-${category.id}`}
            aria-selected={isActive}
            aria-controls={`scapes-panel-${category.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onSelect(category.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`${
              isActive ? "plate-hot" : "plate ts-hard"
            } px-4 py-2 font-display text-sm font-bold tracking-widest uppercase outline-none focus-visible:ring-2 focus-visible:ring-chrome ${
              isActive ? "text-asphalt" : "text-chrome"
            }`}
          >
            {category.name}
          </button>
        );
      })}
    </div>
  );
}
