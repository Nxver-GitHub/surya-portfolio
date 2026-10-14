import type { StageFigure } from "../../../content/gtme";

interface SectionFigureProps {
  figure?: StageFigure;
}

/**
 * Workspace screenshot placed inside a section. The image scales to the
 * frame so the whole capture is visible at once; the image itself links to
 * the full-size file for anyone who wants to read the small text (at phone
 * width that is everyone), and so does the caption's "Full size" mark. Renders nothing when
 * the section carries no figure. The frame runs wider than the 68ch prose
 * column on purpose: these captures are wide UI, and fitting them into the
 * text measure would shrink them past legibility.
 */
export function SectionFigure({ figure }: SectionFigureProps) {
  if (!figure) return null;

  return (
    <figure className="max-w-4xl border border-steel bg-panel">
      <a
        href={figure.src}
        target="_blank"
        rel="noopener noreferrer"
        className="block border-b border-steel outline-none focus-visible:ring-2 focus-visible:ring-gt-bright"
        title="Open the full-size capture in a new tab"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={figure.src}
          alt={figure.alt}
          className="block h-auto w-full"
        />
        <span className="sr-only"> (opens the full-size capture in a new tab)</span>
      </a>
      <figcaption className="flex items-baseline justify-between gap-4 px-4 py-3 text-sm text-silver leading-snug">
        <span>{figure.caption}</span>
        {/* The same target as the image above, for a pointer that reads the
            caption first. It is a duplicate of that link, so it stays out of
            the tab order and the accessibility tree: one stop, one name. */}
        <a
          href={figure.src}
          target="_blank"
          rel="noopener noreferrer"
          aria-hidden="true"
          tabIndex={-1}
          className="inline-flex min-h-6 shrink-0 items-center font-display text-xs tracking-wider text-gt-bright uppercase hover:text-chrome"
        >
          Full size ↗
        </a>
      </figcaption>
    </figure>
  );
}
