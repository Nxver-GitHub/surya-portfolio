import { AttractMode } from "@/components/attract/AttractMode";
import { BootSequence } from "@/components/boot/BootSequence";
import { GtMark } from "@/components/gt/GtMark";
import { CircuitMap } from "@/components/world-map/CircuitMap";
import { HudTotals } from "@/components/world-map/HudTotals";
import { DriverCard } from "@/components/world-map/DriverCard";

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
          <h1 className="gt-title">World Map</h1>
        </div>
        <DriverCard />
      </header>
      <main id="world-content"><CircuitMap /></main>
      <HudTotals />
    </div>
  );
}
