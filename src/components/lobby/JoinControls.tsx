import type { JoinControl } from "../../../content/lobby";

interface JoinControlsProps {
  controls: readonly JoinControl[];
}

// Empty verb renders the channel's own label alone ("Email", not "Email
// Email") — every other channel prefixes its label with a verb.
const VERB_BY_CHANNEL: Record<JoinControl["channel"], string> = {
  email: "",
  calendly: "Book",
  github: "View on",
  linkedin: "Join via",
  x: "Ping on",
};

/**
 * Join-the-lobby control row: Email and Book-a-call are the solid hot-plate
 * primary CTAs (the two highest-intent channels — owner call, 2026-07);
 * GitHub/LinkedIn/X are stamped black plate buttons with the standard orange
 * keyline. Email is a plain mailto link; external channels open in a new tab
 * with safe rel attributes.
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
          const isPrimary =
            control.channel === "email" || control.channel === "calendly";
          return (
            <li key={control.channel}>
              <a
                href={control.href}
                {...(isExternal
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className={
                  isPrimary
                    ? "plate-hot inline-flex items-center gap-2 px-5 py-2.5 font-display text-sm font-bold tracking-widest text-asphalt uppercase outline-none transition-[filter] duration-(--duration-snap) ease-(--ease-mech) hover:brightness-110 focus-visible:ring-2 focus-visible:ring-chrome"
                    : "plate ts-hard inline-flex items-center gap-2 px-5 py-2.5 font-display text-sm font-bold tracking-widest text-gt-bright uppercase outline-none transition-colors duration-(--duration-snap) ease-(--ease-mech) hover:text-chrome focus-visible:ring-2 focus-visible:ring-gt-bright"
                }
              >
                <span>
                  {[VERB_BY_CHANNEL[control.channel], control.label]
                    .filter(Boolean)
                    .join(" ")}
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
