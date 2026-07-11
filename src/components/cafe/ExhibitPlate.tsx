"use client";

import type { Exhibit } from "../../../content/cafe-exhibits";

interface ExhibitPlateProps {
  exhibit: Exhibit;
}

/** The GT2-style attribution link style, shared by all three credit links. */
const LINK_CLASS =
  "underline decoration-silver/40 underline-offset-2 hover:text-chrome";

/**
 * The plate shown when a museum exhibit is focused: its name, the plain-English
 * flavour line, and the full CC credit —
 * "Model: {title} by {author} ({license}) via {source}" — with the title,
 * author, and license as `rel="noopener noreferrer"` links. Mirrors the Garage
 * attribution line style (CarBrowser).
 */
export function ExhibitPlate({ exhibit }: ExhibitPlateProps) {
  const { credit } = exhibit;
  return (
    <div className="plate ts-hard flex flex-col gap-1 px-3 py-2">
      <span className="font-display text-[10px] font-black tracking-[0.18em] text-gt-bright uppercase">
        On display
      </span>
      <span className="font-display text-sm font-bold tracking-wide text-chrome uppercase">
        {exhibit.name}
      </span>
      <span className="text-xs text-silver">{exhibit.flavor}</span>
      <span className="text-xs text-silver/80">
        Model:{" "}
        <a
          href={credit.url}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_CLASS}
        >
          {credit.title}
        </a>{" "}
        by{" "}
        <a
          href={credit.authorUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_CLASS}
        >
          {credit.author}
        </a>{" "}
        (
        <a
          href={credit.licenseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_CLASS}
        >
          {credit.license}
        </a>
        ) via {credit.source}
      </span>
    </div>
  );
}
