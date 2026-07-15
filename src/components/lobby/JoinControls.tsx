import type { JoinControl } from "../../../content/lobby";

interface JoinControlsProps {
  controls: readonly JoinControl[];
}

const VERB_BY_CHANNEL: Record<JoinControl["channel"], string> = {
  email: "Email",
  github: "View on",
  linkedin: "Join via",
  x: "Ping on",
};

/**
 * Join-the-lobby control row: plate-hot buttons for each channel, styled
 * like the stamped hot-plate CTAs used elsewhere. Email is a plain mailto
 * link; external channels open in a new tab with safe rel attributes.
 */
export function JoinControls({ controls }: JoinControlsProps) {
  return (
    <section aria-labelledby="lobby-join-heading" className="mt-10">
      <h2
        id="lobby-join-heading"
        className="ts-hard font-display text-sm font-semibold tracking-[0.25em] text-silver uppercase"
      >
        Join the Lobby
      </h2>

      <ul className="mt-4 flex flex-wrap gap-3">
        {controls.map((control) => {
          const isExternal = control.channel !== "email";
          return (
            <li key={control.channel}>
              <a
                href={control.href}
                {...(isExternal
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="plate-hot inline-flex items-center gap-2 px-5 py-2.5 font-display text-sm font-bold tracking-widest text-asphalt uppercase outline-none transition-[filter] duration-(--duration-snap) ease-(--ease-mech) hover:brightness-110 focus-visible:ring-2 focus-visible:ring-chrome"
              >
                <span>
                  {VERB_BY_CHANNEL[control.channel]} {control.label}
                </span>
                <span aria-hidden="true">→</span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
