/**
 * Beat 3 — the title screen. The GT2 title card: the game name over a rule with
 * a blinking "PRESS START". Here it auto-advances to the World Map (the prompt
 * is flavour — any key/click skips), so no visitor is stranded on a title
 * screen. Centred vertically to stay inside a 9:16 story-safe band.
 */
export function IntroTitle() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
      <p className="ts-hard font-display text-xs font-bold tracking-[0.4em] text-gt-bright uppercase md:text-sm">
        Start your engines
      </p>
      <h1 className="gt-title mt-2 text-center text-5xl text-chrome md:text-7xl">
        Surya Racing
      </h1>
      <div className="gt-rule mt-3 w-48 md:w-72" />
      <p className="intro-blink mt-8 font-display text-xs font-semibold tracking-[0.34em] text-silver uppercase">
        <span aria-hidden="true" className="text-gt-bright">
          ▸
        </span>{" "}
        Press Start{" "}
        <span aria-hidden="true" className="text-gt-bright">
          ◂
        </span>
      </p>
    </div>
  );
}
