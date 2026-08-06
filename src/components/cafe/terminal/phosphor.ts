/**
 * The terminal's phosphor palette and tone mapping (E11).
 *
 * Extracted from LogRenderer so the media viewer can share it without an
 * import cycle (LogRenderer renders MediaZoom, so MediaZoom must not import
 * back from LogRenderer). LogRenderer re-exports these, so existing importers
 * — Terminal.tsx and friends — are unaffected.
 */

import type { LineTone } from "./terminalLines";

export const PHOSPHOR = "#7dff9b";
export const PHOSPHOR_DIM = "#4fbf6c";
export const PHOSPHOR_USER = "#c8ffd6";
export const PHOSPHOR_ERR = "#ff9d6b";

export function toneColor(tone: LineTone): string {
  switch (tone) {
    case "reply":
      return PHOSPHOR;
    case "user":
    case "prompt":
      return PHOSPHOR_USER;
    case "error":
      return PHOSPHOR_ERR;
    case "system":
      return PHOSPHOR_DIM;
  }
}
