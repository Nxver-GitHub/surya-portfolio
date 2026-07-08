interface LockedChipProps {
  label: string;
  /** Pavilion that will make this chip live, e.g. "Garage" */
  unlocksWith: string;
}

/** Dimmed cross-reference chip; becomes a live link when its pavilion ships. */
export function LockedChip({ label, unlocksWith }: LockedChipProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 border border-steel px-2 py-0.5 font-display text-xs font-semibold tracking-wider text-silver/80 uppercase"
      title={`Unlocks with ${unlocksWith}`}
    >
      <span aria-hidden="true">🔒</span>
      {label}
      <span className="text-silver/50">· {unlocksWith}</span>
    </span>
  );
}
