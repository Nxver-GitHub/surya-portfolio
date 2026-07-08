import type { Metadata } from "next";
import { GtCrumb, GtTitle, LozengeLink } from "@/components/gt/GtChrome";
import { LiveryStripe } from "@/components/livery/LiveryStripe";

export const metadata: Metadata = {
  title: "Career — Surya Pugazhenthi",
  description:
    "Surya Pugazhenthi's education and work history: schools, roles, and outcomes, told season by season.",
};

export default function CareerPage() {
  return (
    <div className="relative flex flex-1 flex-col px-5 py-6 md:px-10 md:py-8">
      <GtCrumb label="Career" />

      <header>
        <LozengeLink href="/">
          <span aria-hidden="true">←</span> World Map
        </LozengeLink>
      </header>

      <main className="flex flex-1 flex-col">
        <div className="mt-10 md:mt-12">
          <GtTitle kicker="Story mode">Career</GtTitle>
        </div>

        <div className="mt-10 max-w-xl border border-steel bg-panel shadow-[2px_3px_0_rgba(0,0,0,0.7)]">
          <LiveryStripe livery="marlboro" />
          <div className="p-6">
            <p className="ts-hard font-display text-base font-bold tracking-widest text-gt-bright uppercase">
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
