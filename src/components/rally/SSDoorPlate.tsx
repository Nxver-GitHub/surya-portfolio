import { liveries, type LiveryId } from "../../../content/liveries";

/**
 * Splits a stage's rally chrome ("SS1 · RECON") into the door number and the
 * stage name, so the number can be stamped on a plate and the name can carry
 * on as ordinary chrome text. Chrome with no separator keeps its whole string
 * as the name, and the caller simply renders no plate.
 */
export function stageChromeParts(chrome: string): {
  code: string;
  name: string;
} {
  const [first, ...rest] = chrome.split("·");
  if (rest.length === 0) return { code: "", name: chrome.trim() };
  return { code: first.trim(), name: rest.join("·").trim() };
}

interface SSDoorPlateProps {
  /** Door number, e.g. "SS1" */
  code: string;
  livery?: LiveryId;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Rally door-number plate, built from the license-badge vocabulary: a livery
 * rim around a flat enamel face with the stage number stamped into it, plus
 * the livery's second colour as a hairline outside the rim. The number is real
 * text rather than decoration, because it is the stage's name on this page.
 */
export function SSDoorPlate({
  code,
  livery = "subaru555",
  size = "md",
  className = "",
}: SSDoorPlateProps) {
  const { bars } = liveries[livery];
  const rim = bars[0];
  const edge = bars[1] ?? bars[0];

  return (
    <span
      className={`inline-flex shrink-0 rounded-sm p-px ${className}`}
      style={{ backgroundColor: edge }}
    >
      <span
        className="badge-rim inline-flex"
        style={{ backgroundColor: rim }}
      >
        <span
          className={`badge-face flex items-center justify-center ${
            size === "sm" ? "px-1.5 py-0.5" : "px-2 py-1"
          }`}
        >
          <span
            className={`font-display leading-none font-black tracking-wider text-asphalt uppercase not-italic ${
              size === "sm" ? "text-xs" : "text-sm"
            }`}
          >
            {code}
          </span>
        </span>
      </span>
    </span>
  );
}
