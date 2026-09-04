import type { StageFigure } from "../../../content/gtme";

interface SectionFigureProps {
  figure?: StageFigure;
}

/**
 * Workspace screenshot placed inside a section. The image scales to the
 * frame so the whole capture is visible at once; it links to the full-size
 * file for anyone who wants to read the small text. Renders nothing when
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
      </a>
      <figcaption className="flex items-baseline justify-between gap-4 px-4 py-3 text-sm text-silver leading-snug">
        <span>{figure.caption}</span>
        <span aria-hidden="true" className="shrink-0 font-display text-xs tracking-wider text-gt-bright uppercase">
          Full size ↗
        </span>
      </figcaption>
    </figure>
  );
}
