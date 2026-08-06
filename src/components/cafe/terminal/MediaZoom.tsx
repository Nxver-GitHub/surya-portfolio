"use client";

/**
 * MediaZoom — the full-viewport viewer for a terminal media card (E11).
 *
 * Scrollback media cards are small by necessity: the log measures ~65ch, and
 * in the docked view the whole terminal is painted on a CRT face a few
 * centimetres wide. The teaser poster in particular is unreadable at card
 * size. Clicking any card opens it here.
 *
 * TWO CONSTRAINTS DRIVE THIS FILE:
 *
 * 1. IT MUST PORTAL TO document.body. When the terminal is docked, its DOM is
 *    mounted inside a drei `<Html transform>` — a CSS-3D-transformed container
 *    (see CrtScreenSurface). `position: fixed` inside a transformed ancestor
 *    resolves against THAT ancestor, not the viewport, so an overlay rendered
 *    in place would be trapped inside the tiny CRT face — making the problem
 *    it exists to solve strictly worse. Portalling escapes the transform.
 *
 * 2. IT MUST NEVER UPSCALE. The cards share one component but not one source
 *    size: the portrait is 480x480, the café photos are 1500x2000, the poster
 *    is 1085x1450. A viewer that fills the viewport would blow the portrait up
 *    to three times its resolution. So the image is sized `auto` and only
 *    CAPPED by the viewport — the browser renders each at its natural size,
 *    or smaller if it doesn't fit. No JS measurement, no upscaling, ever.
 *
 * Sits at z-index 65: above the terminal (50) and boot (60), deliberately
 * BELOW the site-wide CRT glass (70) so the zoomed image is still tinted by
 * the tube like everything else. That is also why there is no per-card
 * scanline here — the glass already supplies it, and doubling the treatment
 * moirés against a detailed poster.
 */

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "../../garage/useReducedMotion";
import { PHOSPHOR, PHOSPHOR_DIM } from "./phosphor";
import type { TerminalLine } from "./terminalLines";

interface MediaZoomProps {
  media: NonNullable<TerminalLine["media"]>;
  /** Close and hand focus back to the card that opened this. */
  onClose: () => void;
}

export function MediaZoom({ media, onClose }: MediaZoomProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();

  // Move focus in on open. Focus RESTORATION is the opener's job (MediaCard
  // still holds the trigger ref), so this only has to claim focus.
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Escape closes; Tab is trapped inside the dialog so focus can never wander
  // back to the scrollback underneath while it is aria-hidden from nobody —
  // the layer is modal, so the keyboard must respect that.
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  // Lock background scrolling for the duration — on mobile the viewer covers a
  // full-screen terminal window, and a rubber-banding page behind it reads as
  // the overlay itself being loose.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={media.alt}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      // Backdrop click closes; clicks that originate on the figure do not
      // (see the figure's stopPropagation), so dragging to select or
      // right-clicking to save the image never dismisses it by accident.
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 65,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "clamp(12px, 4vw, 40px)",
        background: "rgba(2, 6, 4, 0.94)",
        animation: reducedMotion
          ? undefined
          : "media-zoom-in 150ms var(--ease-mech)",
      }}
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        style={{
          alignSelf: "flex-end",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          fontSize: 14,
          letterSpacing: "0.08em",
          color: PHOSPHOR,
          background: "transparent",
          border: `1px solid ${PHOSPHOR_DIM}`,
          padding: "6px 12px",
          cursor: "pointer",
        }}
      >
        ESC ✕
      </button>

      <figure
        onClick={(event) => event.stopPropagation()}
        style={{
          margin: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          minHeight: 0,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={media.src}
          alt={media.alt}
          style={{
            display: "block",
            // Natural size, capped — never scaled UP. See constraint 2 above.
            width: "auto",
            height: "auto",
            maxWidth: "min(92vw, 100%)",
            maxHeight: "80vh",
            border: `1px solid ${PHOSPHOR_DIM}`,
            boxShadow: `0 0 24px ${PHOSPHOR_DIM}33`,
          }}
        />
        <figcaption
          style={{
            color: PHOSPHOR_DIM,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            fontSize: 14,
            lineHeight: 1.4,
            maxWidth: "65ch",
            textAlign: "center",
          }}
        >
          {media.alt}
        </figcaption>
      </figure>
    </div>,
    document.body,
  );
}
