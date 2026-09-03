import { specialStage } from "../../../content/gtme";

/**
 * Provenance marker for the Special Stage pavilion.
 *
 * Every number on this pavilion carries a source. Numbers stated in the build
 * artifacts on disk render bare; numbers that come from the working session
 * carry this dot. The legend below (`ProvenanceLegend`, rendered once per
 * page, from `specialStage.provenanceNote`) is what the dot points at.
 */
export function ProvenanceDot() {
  return (
    <span className="inline-flex items-center">
      <span
        aria-hidden="true"
        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-gt-bright"
      />
      <span className="sr-only">Source: working session</span>
    </span>
  );
}

/** The one-line key that explains every dot on the page. */
export function ProvenanceLegend() {
  return (
    <p className="flex max-w-[68ch] items-start gap-2 text-sm text-silver leading-snug">
      <span className="mt-2 shrink-0">
        <ProvenanceDot />
      </span>
      <span>{specialStage.provenanceNote}</span>
    </p>
  );
}
