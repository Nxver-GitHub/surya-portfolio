import Link from "next/link";
import {
  taskHref,
  type MenuBook,
  type MenuBookTask,
} from "../../../content/menu-books";
import { LiveryStripe } from "../livery/LiveryStripe";
import { BookTypePlate } from "./BookCover";

/** One task row: a stamped plate linking to its real destination route. */
function TaskLink({ task }: { task: MenuBookTask }) {
  return (
    <li>
      <Link
        href={taskHref(task.target)}
        className="plate group flex flex-col gap-1 px-4 py-3 outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-chrome"
      >
        <span className="ts-hard font-display text-sm font-bold tracking-wide text-chrome uppercase group-hover:text-white">
          {task.label}
        </span>
        <span className="text-sm leading-snug text-silver">
          {task.description}
        </span>
      </Link>
    </li>
  );
}

/**
 * Detail panel for the selected Menu Book: its type plate and audience, the
 * blurb, then its 2–5 tasks as links into the real pavilions. Rendered as a
 * labelled region so it reads as the live counterpart to the tab selection.
 */
export function BookPanel({ book }: { book: MenuBook }) {
  return (
    <section
      aria-labelledby={`book-${book.id}-title`}
      className="flex flex-col gap-4 border border-steel bg-[#0d0d0f] p-5 shadow-[2px_3px_0_rgba(0,0,0,0.7)] md:p-6"
    >
      <div className="w-24">
        <LiveryStripe livery="warsteiner" />
      </div>

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <BookTypePlate type={book.type} />
          <span className="ts-hard font-display text-xs font-semibold tracking-[0.2em] text-silver uppercase">
            {book.audience}
          </span>
        </div>
        <h2
          id={`book-${book.id}-title`}
          className="ts-hard font-display text-2xl font-black tracking-wide text-chrome uppercase md:text-3xl"
        >
          {book.title}
        </h2>
        <p className="max-w-prose text-base leading-relaxed text-silver">
          {book.blurb}
        </p>
      </header>

      <div>
        <p className="ts-hard mb-2 font-display text-xs font-semibold tracking-[0.25em] text-silver uppercase">
          On this reading path
        </p>
        <ul className="flex flex-col gap-2">
          {book.tasks.map((task) => (
            <TaskLink key={task.id} task={task} />
          ))}
        </ul>
      </div>
    </section>
  );
}
