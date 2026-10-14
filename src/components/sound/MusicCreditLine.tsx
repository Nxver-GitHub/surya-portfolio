import { musicCredit } from "../../../content/music";

/* inline-block + 4px of block padding lifts each link's hit area to 24px
   (WCAG 2.5.8) at the 12px caption size; the matching negative margin keeps
   the line box where it was, so the caption's rhythm does not change. */
const LINK =
  "inline-block py-1 -my-1 underline decoration-silver/40 underline-offset-2 hover:text-chrome focus-visible:text-chrome";

/**
 * The CC BY 4.0 credit, written once and rendered in two lengths.
 *
 * This is a licence term, not decoration: the licence asks for the title, the
 * author, a link to the source, a link to the licence, and a note of what was
 * changed. The deck bar has room for a caption, not for all five, so the bar
 * shows the short form and the Sound Select popup — one press away at every
 * width, and the only place the credit appears on a phone — carries the full
 * attribution. Between them nothing the licence asks for goes unsaid.
 *
 * Facts in plain English under a game label, like every other caption here.
 */
export function MusicCreditLine({
  variant,
  className,
}: {
  /** `short` for the bar caption, `full` for the licence-complete form. */
  variant: "short" | "full";
  className?: string;
}) {
  const author = (
    <a
      href={musicCredit.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={LINK}
    >
      {musicCredit.author}
    </a>
  );
  const license = (
    <a
      href={musicCredit.licenseUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={LINK}
    >
      {musicCredit.licenseName}
    </a>
  );

  if (variant === "short") {
    return (
      <p className={className}>
        Music: {author} &mdash; {license}
      </p>
    );
  }

  return (
    <p className={className}>
      Music: &ldquo;{musicCredit.shortTitle}&rdquo; by {author} (itch.io)
      &mdash; {license}, {musicCredit.changes}.
    </p>
  );
}
