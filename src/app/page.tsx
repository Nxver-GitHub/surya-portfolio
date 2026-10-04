import { AttractMode } from "@/components/attract/AttractMode";
import { BootSequence } from "@/components/boot/BootSequence";
import { GtMark } from "@/components/gt/GtMark";
import { CircuitMap } from "@/components/world-map/CircuitMap";
import { HudTotals } from "@/components/world-map/HudTotals";
import { DriverCard } from "@/components/world-map/DriverCard";
import { PERSON_NAME } from "@/lib/identity";

export default function Home() {
  return (
    <div className="world-screen">
      <BootSequence />
      <AttractMode />
      <header className="world-header">
        {/* Mark + screen name on the left, driver on the right. The visitor's
            own name lives in the driver card alone — it used to sit here too,
            as a second link to the same place. */}
        <div className="world-brand">
          <GtMark />
          {/* The screen still reads "World Map"; the heading names the person
              the site is about. The same name is visible beside it in the
              Driver Profile card, so this is the page's subject, not hidden
              copy. */}
          <h1 className="gt-title">
            <span className="sr-only">{PERSON_NAME}: </span>World Map
          </h1>
        </div>
        <DriverCard />
      </header>
      <main id="world-content"><CircuitMap /></main>
      <HudTotals />
    </div>
  );
}
