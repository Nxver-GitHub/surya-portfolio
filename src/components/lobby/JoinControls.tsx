import { emailAddress, type JoinControl } from "../../../content/lobby";
import { resume } from "../../../content/resume";
import { EmailPlate } from "./EmailPlate";

interface JoinControlsProps {
  controls: readonly JoinControl[];
}

// Empty verb renders the channel's own label alone ("Email", not "Email
// Email") — every other channel prefixes its label with a verb.
const VERB_BY_CHANNEL: Record<JoinControl["channel"], string> = {
  email: "",
  calendly: "Book",
  resume: "Download",
  github: "View on",
  linkedin: "Join via",
  x: "Ping on",
};

const PRIMARY_CLASS =
  "plate-hot inline-flex items-center gap-2 px-5 py-2.5 font-display text-sm font-bold tracking-widest text-asphalt uppercase outline-none transition-[filter] duration-(--duration-snap) ease-(--ease-mech) hover:brightness-110 focus-visible:ring-2 focus-visible:ring-chrome";

const SECONDARY_CLASS =
  "plate ts-hard inline-flex items-center gap-2 px-5 py-2.5 font-display text-sm font-bold tracking-widest text-gt-bright uppercase outline-none transition-colors duration-(--duration-snap) ease-(--ease-mech) hover:text-chrome focus-visible:ring-2 focus-visible:ring-gt-bright";

function controlLabel(control: JoinControl): string {
  return [VERB_BY_CHANNEL[control.channel], control.label]
    .filter(Boolean)
    .join(" ");
}

/**
 * Join-the-lobby control row: Email and Book-a-call are the solid hot-plate
 * primary CTAs (the two highest-intent channels — owner call, 2026-07);
 * Résumé is a stamped plate that downloads the Driver Profile PDF directly;
 * GitHub/LinkedIn/X are stamped black plate buttons with the standard keyline
 * and open in a new tab with safe rel attributes. The email plate assembles
 * its mailto after hydration so the address never sits in static HTML.
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
        {controls.map((control) => (
          <li key={control.channel}>
            <JoinPlate control={control} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function JoinPlate({ control }: { control: JoinControl }) {
  const label = controlLabel(control);

  if (control.channel === "email") {
    return (
      <EmailPlate
        address={emailAddress}
        label={label}
        className={PRIMARY_CLASS}
      />
    );
  }

  if (control.channel === "resume") {
    return (
      <a
        href={control.href}
        download={resume.filename}
        className={SECONDARY_CLASS}
      >
        <span>{label}</span>
        <span aria-hidden="true">↓</span>
      </a>
    );
  }

  const isPrimary = control.channel === "calendly";
  return (
    <a
      href={control.href}
      target="_blank"
      rel="noopener noreferrer"
      className={isPrimary ? PRIMARY_CLASS : SECONDARY_CLASS}
    >
      <span>{label}</span>
      <span aria-hidden="true">→</span>
    </a>
  );
}
