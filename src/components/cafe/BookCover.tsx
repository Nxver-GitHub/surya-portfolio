import { bookTypeLabel, type BookType } from "../../../content/menu-books";

/** GT-style type plate for a book: a small stamped "Collection / Tournament /
 * Miscellaneous" chip. Purely presentational. */
export function BookTypePlate({ type }: { type: BookType }) {
  return (
    <span className="plate ts-hard inline-flex items-center px-2.5 py-1 font-display text-[11px] font-black tracking-[0.2em] text-chrome uppercase">
      {bookTypeLabel(type)}
    </span>
  );
}
