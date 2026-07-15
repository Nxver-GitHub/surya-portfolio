interface ViewfinderFrameProps {
  /**
   * Aspect ratio to reserve, e.g. `${width} / ${height}`. Omit when the
   * parent already controls sizing (e.g. an absolutely-positioned fill).
   */
  aspectRatio?: string;
  /** Roll number label, e.g. "Roll 01" */
  rollLabel: string;
  /** Subtle film-edge frame number, e.g. "01A" */
  frameNumber: string;
  className?: string;
}

/**
 * Decorative "not yet developed" frame for a reserved Scapes slot: a
 * viewfinder of four L-shaped corner brackets around a center caption,
 * plus a subtle film-edge frame number. Purely presentational — always
 * `aria-hidden`, never focusable. Real photos replace these entirely once
 * content lands (see content/photos.ts swap procedure).
 */
export function ViewfinderFrame({
  aspectRatio,
  rollLabel,
  frameNumber,
  className = "",
}: ViewfinderFrameProps) {
  return (
    <div
      aria-hidden="true"
      className={`relative flex w-full items-center justify-center overflow-hidden border border-steel bg-panel ${className}`}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {/* faint grid-paper texture, matching the page background */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "12px 12px",
        }}
      />

      {/* viewfinder corner brackets */}
      <span className="absolute top-3 left-3 h-4 w-4 border-t-2 border-l-2 border-silver/50" />
      <span className="absolute top-3 right-3 h-4 w-4 border-t-2 border-r-2 border-silver/50" />
      <span className="absolute bottom-3 left-3 h-4 w-4 border-b-2 border-l-2 border-silver/50" />
      <span className="absolute right-3 bottom-3 h-4 w-4 border-r-2 border-b-2 border-silver/50" />

      {/* film-edge frame number */}
      <span className="absolute bottom-2 left-3 font-display text-[11px] font-semibold tracking-widest text-silver/40 uppercase">
        {frameNumber}
      </span>

      <p className="ts-hard relative px-6 text-center font-display text-xs font-semibold tracking-[0.2em] text-silver/70 uppercase">
        {rollLabel} — Not Yet Developed
      </p>
    </div>
  );
}
