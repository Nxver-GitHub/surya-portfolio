import Link from "next/link";
import { BootSequence } from "@/components/boot/BootSequence";
import { GtCrumb, GtTitle } from "@/components/gt/GtChrome";
import { CircuitMap } from "@/components/world-map/CircuitMap";
import { DriverCard } from "@/components/world-map/DriverCard";
import { HudTotals } from "@/components/world-map/HudTotals";
import { PavilionList } from "@/components/world-map/PavilionList";

export default function Home() {
  return (
    // Desktop is a console screen: exactly one viewport, never a scrollbar
    // (h-dvh + overflow-hidden; the circuit map shrinks to the space left).
    // Mobile keeps normal scrolling for the plate-button list.
    <div className="relative flex flex-1 flex-col px-5 py-6 md:h-dvh md:max-h-dvh md:min-h-0 md:overflow-hidden md:px-10 md:py-8">
      <BootSequence />
      <GtCrumb label="World Map" />

      <header className="flex items-baseline justify-between">
        <p className="ts-hard font-display text-lg font-black tracking-wide uppercase">
          Surya <span className="text-gt-bright">Pugazhenthi</span>
        </p>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        {/* Title block left; driver license card right (stacks below the
            start-here plate on mobile) */}
        <div className="mt-10 mb-8 flex flex-col gap-6 md:mt-12 md:mb-10 md:flex-row md:items-start md:justify-between md:gap-10"><div>
          <GtTitle>World Map</GtTitle>
          <p className="mt-3 max-w-[52ch] text-base text-ink leading-snug">
            Pick a pavilion to explore work, skills, and projects.
          </p>
          <Link
            transitionTypes={["nav-forward"]}
            href="/cafe"
            data-sfx="confirm"
            className="plate ts-hard mt-4 inline-block px-3 py-1.5 font-display text-xs font-bold tracking-widest text-gt-bright uppercase outline-none hover:text-chrome focus-visible:ring-2 focus-visible:ring-gt-bright"
          >
            New here? → Start with the GT Café menus
          </Link>
        </div><DriverCard /></div>

        {/* Desktop: circuit map. Mobile: plate-button menu. min-h-0 lets the
            map zone shrink so the page always fits one viewport; md:flex (not
            block) stretches the map to the zone's definite height. */}
        <div className="hidden min-h-0 flex-1 md:flex">
          <CircuitMap />
        </div>
        <div className="md:hidden">
          <PavilionList />
        </div>

        <HudTotals />
      </main>
    </div>
  );
}
