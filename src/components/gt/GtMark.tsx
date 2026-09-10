/**
 * The system mark — an enamel "SP" badge in the corner of every screen, the way
 * a console game's logo persists across its menus. Deliberately the same badge
 * the boot sequence seats under a spotlight (IntroMonogram, Beat 1), so the mark
 * a visitor meets on the title card is the mark that follows them through the
 * pavilions.
 *
 * It is chrome, not navigation: no link, no tab stop, hidden from assistive
 * tech. Every screen already carries a real route home (the map itself, or the
 * "← World Map" lozenge on interiors), and a second one here would only be a
 * duplicate destination to tab past.
 */
export function GtMark() {
  return (
    <span className="gt-mark badge-rim bg-gt" aria-hidden="true">
      <span className="gt-mark-face badge-face">SP</span>
    </span>
  );
}
