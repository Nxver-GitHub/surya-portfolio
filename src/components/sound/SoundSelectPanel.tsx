"use client";

import { Glyph } from "@/components/gt/Glyph";
import {
  labelForVolumeStep,
  VOLUME_STEPS,
  type VolumeStep,
} from "@/lib/music-volume";
import type { MusicDeck } from "./useMusicDeck";

/**
 * The stamped popup behind the readout: the whole rotation as pickable rows,
 * then the deck's stepped level.
 *
 * Plain buttons rather than a listbox on purpose. A listbox would mean roving
 * focus and a hand-rolled key map; ordinary buttons are reachable with Tab in
 * both directions, activate with Enter and Space for free, and carry the state
 * in `aria-current` (this is the track playing) and `aria-pressed` (this notch
 * is set) — which is what a visitor on a screen reader actually needs to know.
 * Escape and click-away are handled by the strip that owns this panel.
 */
export function SoundSelectPanel({
  id,
  deck,
}: {
  id: string;
  deck: MusicDeck;
}) {
  return (
    <div
      id={id}
      role="group"
      aria-label="Sound Select"
      className="sound-panel bg-grid-paper"
    >
      <p className="sound-panel-heading ts-hard font-display">Sound Select</p>

      <ul className="sound-panel-list">
        {deck.tracks.map((track, index) => {
          const current = deck.index === index;
          return (
            <li key={track.src}>
              <button
                type="button"
                aria-current={current ? "true" : undefined}
                data-sfx="confirm"
                onClick={() => deck.select(index)}
                className={`sound-panel-row ${
                  current ? "plate-hot text-asphalt" : "ts-hard text-chrome"
                }`}
              >
                <span className="sound-panel-num font-display">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="sound-panel-name">{track.title}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="sound-panel-volume" role="group" aria-label="Volume">
        <span className="sound-panel-label ts-hard font-display">Volume</span>
        <div className="sound-panel-steps">
          {VOLUME_STEPS.map((step: VolumeStep) => {
            const set = deck.volume === step;
            return (
              <button
                key={step}
                type="button"
                aria-pressed={set}
                aria-label={`Volume ${labelForVolumeStep(step)}`}
                data-sfx="move"
                onClick={() => deck.setVolume(step)}
                className={`sound-panel-step font-display ${
                  set ? "plate-hot text-asphalt" : "plate ts-hard text-silver"
                }`}
              >
                {labelForVolumeStep(step)}
              </button>
            );
          })}
        </div>
      </div>

      <p className="sound-panel-foot">
        <Glyph kind="signal" size="0.9em" />
        <span>
          {deck.playing ? "Now playing" : "Deck stopped"}
        </span>
      </p>
    </div>
  );
}
