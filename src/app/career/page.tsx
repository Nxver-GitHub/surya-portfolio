import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Career — Surya Pugazhenthi",
  description:
    "Surya Pugazhenthi's education and work history: schools, roles, and outcomes, told season by season.",
};

export default function CareerPage() {
  return (
    <div className="flex flex-1 flex-col px-5 py-6 md:px-10 md:py-8">
      <header className="flex items-baseline justify-between">
        <Link
          href="/"
          className="font-display text-sm font-bold tracking-[0.25em] uppercase outline-none hover:text-accent focus-visible:ring-2 focus-visible:ring-accent"
        >
          ← World Map
        </Link>
      </header>

      <main className="flex flex-1 flex-col">
        <p className="mt-8 font-display text-xs font-semibold tracking-widest text-ink-soft uppercase md:mt-10">
          Story mode
        </p>
        <h1 className="font-display text-4xl font-black tracking-tight uppercase md:text-6xl">
          Career
        </h1>

        <div className="mt-10 max-w-xl border-4 border-ink bg-paper p-6">
          <p className="font-display text-sm font-bold tracking-widest text-accent uppercase">
            Season data loading
          </p>
          <p className="mt-2 text-ink-soft">
            The season-by-season history of Surya&apos;s education and work is
            being compiled. Head back to the world map while the grid forms.
          </p>
        </div>
      </main>
    </div>
  );
}
