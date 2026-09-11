/** Blocky period memory-card glyph, built from plain shapes — no copyrighted iconography. */
function MemoryCardGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect x="1" y="1" width="14" height="14" fill="#adb3bf" stroke="#090e18" strokeWidth="1" />
      <rect x="3" y="3" width="3" height="4" fill="#090e18" />
      <rect x="7" y="3" width="6" height="2" fill="#090e18" />
      <rect x="3" y="9" width="10" height="1.5" fill="#090e18" />
      <rect x="3" y="11.5" width="6" height="1.5" fill="#090e18" />
    </svg>
  );
}

interface MemoryCardToastProps {
  visible: boolean;
}

/**
 * The stamped "Saving to Memory Card" toast — a period save-indicator, styled
 * from the existing `.plate` chrome. The live region itself stays mounted so
 * assistive tech reliably announces the one message per debounced burst;
 * only the visible panel inside it is conditional. Bottom-right, square
 * corners, hard mechanical fade-in on show; hides with a hard cut (both are
 * "fades/cuts out mechanically" per the design law). Under reduced motion the
 * fade is skipped but the toast still shows.
 */
export function MemoryCardToast({ visible }: MemoryCardToastProps) {
  return (
    <div
      aria-live="polite"
      role="status"
      className="memory-card-toast pointer-events-none fixed right-4 bottom-4 z-65"
    >
      {visible ? (
        <div className="memory-card-toast-panel plate ts-hard flex items-center gap-2 px-3 py-2 font-display text-xs font-bold tracking-wide text-chrome uppercase">
          <MemoryCardGlyph />
          <span>Saving to Memory Card (1)&hellip; Do not remove.</span>
        </div>
      ) : null}
    </div>
  );
}
