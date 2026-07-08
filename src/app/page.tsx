import { CircuitMap } from "@/components/world-map/CircuitMap";
import { PavilionList } from "@/components/world-map/PavilionList";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col px-5 py-6 md:px-10 md:py-8">
      <header className="flex items-baseline justify-between">
        <p className="font-display text-lg font-black tracking-wide italic uppercase">
          Surya <span className="text-track">Racing</span>
        </p>
        <p className="hidden font-display text-xs font-semibold tracking-widest text-silver italic uppercase sm:block">
          Portfolio system · Bay Area · 2026
        </p>
      </header>

      <main className="flex flex-1 flex-col">
        <h1 className="mt-8 font-display text-5xl font-black tracking-tight italic uppercase md:mt-10 md:text-7xl">
          World <span className="text-track">Map</span>
        </h1>
        <p className="mt-1 mb-8 text-base text-silver md:mb-10">
          Pick a pavilion to explore work, skills, and projects.
        </p>

        {/* Desktop: circuit map. Mobile: stacked menu panels. */}
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
