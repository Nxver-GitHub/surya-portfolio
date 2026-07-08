import { CircuitMap } from "@/components/world-map/CircuitMap";
import { PavilionList } from "@/components/world-map/PavilionList";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col px-5 py-6 md:px-10 md:py-8">
      <header className="flex items-baseline justify-between">
        <p className="font-display text-sm font-bold tracking-[0.25em] uppercase">
          Surya Racing
        </p>
        <p className="hidden font-display text-xs font-semibold tracking-widest text-ink-soft uppercase sm:block">
          Portfolio system · Bay Area · 2026
        </p>
      </header>

      <main className="flex flex-1 flex-col">
        <h1 className="mt-8 font-display text-4xl font-black tracking-tight uppercase md:mt-10 md:text-6xl">
          World Map
        </h1>
        <p className="mt-1 mb-8 text-base text-ink-soft md:mb-10">
          Pick a pavilion to explore work, skills, and projects.
        </p>

        {/* Desktop: circuit map. Mobile: R4-style stacked menu. */}
        <div className="hidden flex-1 md:block">
          <CircuitMap />
        </div>
        <div className="md:hidden">
          <PavilionList />
        </div>
      </main>
    </div>
  );
}
