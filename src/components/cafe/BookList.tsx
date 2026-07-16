"use client";

import { useRef } from "react";
import {
  bookTypeLabel,
  menuBooks,
  type MenuBook,
} from "../../../content/menu-books";

interface BookListProps {
  selectedId: string;
  onSelect: (book: MenuBook) => void;
}

/**
 * The semantic spine of the café: an ARIA tablist of the Menu Books. This is
 * the enhancement-independent way to drive selection — full keyboard support
 * via a roving tabindex, so the 3D canvas is never required to operate the
 * page. Mirrors the License Center's tier tablist pattern.
 */
export function BookList({ selectedId, onSelect }: BookListProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusTab = (index: number) => {
    const clamped = (index + menuBooks.length) % menuBooks.length;
    const book = menuBooks[clamped];
    tabRefs.current[clamped]?.focus();
    onSelect(book);
  };

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        event.preventDefault();
        focusTab(index + 1);
        break;
      case "ArrowUp":
      case "ArrowLeft":
        event.preventDefault();
        focusTab(index - 1);
        break;
      case "Home":
        event.preventDefault();
        focusTab(0);
        break;
      case "End":
        event.preventDefault();
        focusTab(menuBooks.length - 1);
        break;
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Menu Books"
      aria-orientation="vertical"
      className="flex flex-col gap-2"
    >
      {menuBooks.map((book, index) => {
        const isActive = book.id === selectedId;
        return (
          <button
            key={book.id}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={`book-tab-${book.id}`}
            aria-selected={isActive}
            aria-controls={`book-panel-${book.id}`}
            tabIndex={isActive ? 0 : -1}
            data-sfx="move"
            onClick={() => onSelect(book)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`${
              isActive ? "plate-hot" : "plate"
            } flex w-full flex-col gap-0.5 px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-chrome`}
          >
            <span
              className={`font-display text-base leading-tight font-bold tracking-wide uppercase ${
                isActive ? "text-asphalt" : "ts-hard text-chrome"
              }`}
            >
              {book.title}
            </span>
            <span className="flex items-start gap-2">
              <span
                className={`shrink-0 font-display text-xs font-black tracking-widest uppercase ${
                  isActive ? "text-asphalt/90" : "text-gt-bright"
                }`}
              >
                {bookTypeLabel(book.type)}
              </span>
              <span
                className={`line-clamp-2 text-xs ${
                  isActive ? "text-asphalt/90" : "text-silver"
                }`}
              >
                {book.audience}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
