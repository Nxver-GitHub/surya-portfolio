import type { LiveryId } from "../../../content/liveries";
import { LiveryStripe } from "@/components/livery/LiveryStripe";
import { SSDoorPlate, stageChromeParts } from "./SSDoorPlate";

interface TimingBoardProps {
  /** The stage's rally chrome, e.g. "SS1 · RECON" */
  chrome: string;
  /** The stage's date window, e.g. "Aug 25 to 26" */
  window: string;
  livery?: LiveryId;
  className?: string;
}

/**
 * Rally timing strip: the band a stage page opens with, above its title.
 * Door plate, stage name, and the date window read off a single line, the way
 * a start-line board carries car, stage and time. This replaces the kicker
 * line the page used to print above the h1, so the same facts appear once.
 */
export function TimingBoard({
  chrome,
  window: stageWindow,
  livery = "subaru555",
  className = "",
}: TimingBoardProps) {
  const { code, name } = stageChromeParts(chrome);

  return (
    <div
      className={`flex items-stretch border border-steel bg-panel shadow-[2px_3px_0_rgba(0,0,0,0.7)] ${className}`}
    >
      <LiveryStripe livery={livery} direction="vertical" />

      <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        {code ? <SSDoorPlate code={code} livery={livery} /> : null}

        <p className="ts-hard font-display text-sm font-bold tracking-[0.25em] text-chrome uppercase">
          {name}
        </p>

        <p className="ml-auto flex items-baseline gap-2 tabular-nums">
          <span className="font-display text-xs tracking-[0.22em] text-silver uppercase">
            Window
          </span>
          <span className="ts-hard font-display text-sm font-bold tracking-wide text-chrome uppercase">
            {stageWindow}
          </span>
        </p>
      </div>

      <LiveryStripe livery={livery} direction="vertical" />
    </div>
  );
}
