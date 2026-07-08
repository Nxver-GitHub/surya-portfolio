import type { Metadata } from "next";
import Link from "next/link";
import { LiveryStripe } from "@/components/livery/LiveryStripe";

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
          className="font-display text-sm font-bold tracking-widest italic uppercase outline-none hover:text-track focus-visible:ring-2 focus-visible:ring-track"
        >
          ← World Map
        </Link>
      </header>

      <main className="flex flex-1 flex-col">
        <p className="mt-8 font-display text-sm font-semibold tracking-widest text-silver italic uppercase md:mt-10">
          Story mode
        </p>
        <h1 className="font-display text-5xl font-black tracking-tight italic uppercase md:text-7xl">
          Career
        </h1>

        <div className="panel clip-cut mt-10 max-w-xl">
          <LiveryStripe livery="marlboro" />
          <div className="p-6">
            <p className="font-display text-base font-bold tracking-widest text-track italic uppercase">
              Season data loading
            </p>
            <p className="mt-2 text-silver">
              The season-by-season history of Surya&apos;s education and work
              is being compiled. Head back to the world map while the grid
              forms.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
