import type { StageFigure } from "../../../content/gtme";

interface SectionFigureProps {
  figure?: StageFigure;
}

/**
 * Workspace screenshot placed inside a section, in a bordered frame that
 * scrolls sideways rather than shrinking the image to unreadable. Renders
 * nothing when the section carries no figure, which is every section today.
 */
export function SectionFigure({ figure }: SectionFigureProps) {
  if (!figure) return null;

  return (
    <figure className="max-w-[68ch] border border-steel bg-panel">
      <div className="overflow-x-auto border-b border-steel">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={figure.src}
          alt={figure.alt}
          className="block h-auto max-w-none"
        />
      </div>
      <figcaption className="px-4 py-3 text-sm text-silver leading-snug">
        {figure.caption}
      </figcaption>
    </figure>
  );
}
