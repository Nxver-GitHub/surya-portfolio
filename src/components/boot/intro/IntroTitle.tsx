/**
 * Beat 3 — the title screen. The GT2 title card: the game name over a rule with
 * a blinking "PRESS START". The prompt is a real gate — BootSequence holds here
 * until the visitor clicks or presses a key, like the original title screen.
 * Centred vertically to stay inside a 9:16 story-safe band.
 */
export function IntroTitle({ onStart }: { onStart: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
      <div
        className="intro-vignette pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
      <div className="relative z-10 flex flex-col items-center">
        <p className="ts-hard font-display text-xs font-bold tracking-[0.4em] text-gt-bright uppercase md:text-sm">
          Start your engines
        </p>
        <h1 className="gt-title mt-2 text-center text-5xl text-chrome md:text-7xl">
          Surya Pugazhenthi
        </h1>
        <div className="gt-rule mt-3 w-64 md:w-104" />
        <button type="button" onClick={onStart} className="intro-blink mt-8 min-h-11 px-5 py-2 font-display text-base font-semibold tracking-[0.15em] text-silver uppercase focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gt-bright">
          <span aria-hidden="true" className="text-gt-bright">
            ▸
          </span>{" "}
          Press Start{" "}
          <span aria-hidden="true" className="text-gt-bright">
            ◂
          </span>
        </button>
      </div>
    </div>
  );
}
