"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Glyph } from "@/components/gt/Glyph";
import { MusicCreditLine } from "./MusicCreditLine";
import { SoundSelectPanel } from "./SoundSelectPanel";
import { useMusicDeck } from "./useMusicDeck";

/** What the readout says with nothing sounding — an idle deck, not a title. */
const IDLE_READOUT = "— —";

/**
 * SOUND SELECT — the site's music UI, a deck bar pinned along the bottom edge.
 *
 * It was briefly built into the page headers, which put it in the middle of
 * whatever each screen was trying to say and forced the world map to float it
 * out of flow. A console's transport belongs on its own strip, so it is one
 * fixed bar now: mounted once in the root layout, present on every route, and
 * owned by no page. Transport keys and the track readout hold the left, the
 * licence credit the right — the reading order of a deck face.
 *
 * Its top border is the stamped 2px rule of `.map-control-strip`, because that
 * is what a hint strip along the bottom of a screen already looks like here.
 *
 * It is always visible and always stopped until asked: the deck reads "■ — —"
 * and pressing play is how a visitor opts into music. That press is both the
 * consent and the user gesture the autoplay policy wants, and it writes the
 * same persisted key the Options panel used to own, so anyone who already had
 * music on keeps it on.
 *
 * The popup opens UPWARD out of the bar. On narrow viewports the credit folds
 * into that popup and the prev key drops, leaving play/pause, next and a
 * truncated title in the thumb zone. That is CSS, not a second tree.
 */
export function SoundBar() {
  const deck = useMusicDeck();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const readoutRef = useRef<HTMLButtonElement | null>(null);
  const panelId = useId();

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) readoutRef.current?.focus();
  }, []);

  // Click-away, Escape, and tabbing clean out of the panel all close it. No
  // focus trap: this is a menu hanging off a bar control, so walking past it
  // with Tab should leave, not be caught.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true);
    };
    const onFocusIn = (event: FocusEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [open, close]);

  const title = deck.track?.title ?? IDLE_READOUT;

  return (
    <div className="sound-bar" ref={rootRef}>
      {/* The transport and its drawer are one positioned run, so the popup
          hangs off the readout rather than off the full-width bar. */}
      <div className="sound-bar-transport">
        <div className="sound-deck" role="group" aria-label="Music transport">
          <button
            type="button"
            aria-label="Previous track"
            data-sfx="move"
            onClick={deck.prev}
            className="lozenge sound-btn sound-btn-prev"
          >
            <Glyph kind="prev" size="15px" />
          </button>
          <button
            type="button"
            // The control flips the persisted opt-in, so that is what "pressed"
            // reports; the glyph and the name follow the same intent, which is
            // why they flip on the press rather than when audio finally decodes.
            aria-pressed={deck.enabled}
            aria-label={deck.enabled ? "Pause music" : "Play music"}
            data-sfx="confirm"
            onClick={deck.toggle}
            className={`sound-btn sound-btn-play ${
              deck.enabled ? "plate-hot" : "lozenge"
            }`}
          >
            <Glyph kind={deck.enabled ? "pause" : "play"} size="15px" />
          </button>
          <button
            type="button"
            aria-label="Next track"
            data-sfx="move"
            onClick={deck.next}
            className="lozenge sound-btn sound-btn-next"
          >
            <Glyph kind="next" size="15px" />
          </button>
        </div>

        <button
          ref={readoutRef}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={
            deck.track
              ? `Now playing ${deck.track.title}. Choose track and volume`
              : "Choose track and volume"
          }
          data-sfx="move"
          onClick={() => setOpen((o) => !o)}
          className="plate sound-readout"
        >
          <span className="sound-readout-mark" aria-hidden="true">
            <Glyph kind={deck.playing ? "play" : "stop"} size="11px" />
          </span>
          <span className="sound-readout-title ts-hard font-display">
            {title}
          </span>
          {/* CSS triangle, the same selection-cursor shape used across the
              system — a drawn mark, never a typed one that a bitmap face might
              not carry. It points up, at the drawer it opens. */}
          <span className="sound-readout-chevron" aria-hidden="true" />
        </button>

        {open ? <SoundSelectPanel id={panelId} deck={deck} /> : null}
      </div>

      {/* Wide screens carry the credit on the bar itself. Narrow ones hide it
          here and show the full form inside the popup instead — `display: none`
          takes it out of the accessibility tree too, so there is never a second
          copy of these links in the tab order. */}
      <MusicCreditLine variant="short" className="sound-bar-credit" />

      {/* The rotation advances on its own every few minutes; a button's text
          changing is silent to a screen reader, so the deck says so here.
          Empty while stopped — a stopped deck has nothing to announce. */}
      <span aria-live="polite" className="sr-only">
        {deck.playing && deck.track ? `Now playing ${deck.track.title}` : ""}
      </span>
    </div>
  );
}
