/**
 * Beat 1 — the "studio" mark. Mirrors GT2's developer logo (Polyphony Digital)
 * appearing before the game title: an enamel "SP" badge seats under a spotlight
 * with an old film-projector flicker, then the montage hard-cuts in. Kept
 * distinct from the Beat-3 "Surya Pugazhenthi" wordmark so the intro reads as a
 * system booting, not one title card shown twice. Timeless: brand identity only.
 */
export function IntroMonogram() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-asphalt">
      <div className="intro-spotlight absolute inset-0" aria-hidden="true" />
      <div className="intro-flicker relative flex flex-col items-center gap-5">
        <div className="intro-seat badge-rim bg-gt">
          <div className="badge-face flex aspect-square w-[clamp(116px,24vh,208px)] items-center justify-center">
            <span className="font-display text-[clamp(52px,12vh,104px)] leading-none font-black tracking-[-0.04em] text-asphalt">
              SP
            </span>
          </div>
        </div>
        <p className="ts-hard font-display text-xs font-bold tracking-[0.42em] text-silver uppercase md:text-sm">
          Portfolio System
        </p>
      </div>
    </div>
  );
}
