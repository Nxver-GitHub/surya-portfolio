# Menu music

The rotating playlist behind the Sound Select strip in the page header. Three
tracks, played through in order and cycled, one continuous rotation site-wide —
deliberately not a theme per destination.

The playlist and its attribution are declared in
[`content/music.ts`](../../content/music.ts); the player is
[`src/lib/bgm.ts`](../../src/lib/bgm.ts). Adding or removing a file here means
editing that content file, not the engine.

## Attribution (required)

These tracks are **not ours**. They are used under CC BY 4.0, which obliges us
to name the work and its author, link the source and the licence, and state
what we changed. The same credit is rendered in the Options panel so it is
visible to visitors, not only to people reading the repository.

> Music: "(FREE) PS1-Era Inspired Jungle - Drum & Bass (Music Pack)" by
> **elevchyt**, from
> <https://elevchyt.itch.io/ps1-era-inspired-jungledrum-bass-music-pack-free>,
> licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
> **Changes:** the pack's `seamless_loop` versions were re-encoded from Ogg
> Vorbis to AAC (96 kbps, 44.1 kHz, stereo) for web delivery. The audio itself
> is otherwise unaltered — no edits, no re-arrangement, no remixing.

If the credit is ever removed from the Options panel, the licence is breached.
It is a term, not a courtesy.

## Files

| File | Track | Length | Size |
| --- | --- | --- | --- |
| `sunset-relay.m4a` | Sunset Relay | 3:55 | 2.8 MB |
| `midnight-trial.m4a` | Midnight Trial | 3:39 | 2.6 MB |
| `activez-les-plaisir.m4a` | Activez les Plaisir | 3:12 | 2.3 MB |

**Total: 7.7 MB / 10:46.** Only one track is fetched at a time — the rotation
pulls the next track's bytes while the current one plays — so a visitor who
turns music on and leaves after a minute downloads about 3 MB, not all of it.

The rotation was cut from five tracks to three when the Sound Select strip
landed: the strip lists the whole playlist as pickable rows, and a list short
enough to read at a glance beats two extra minutes of audio in the repository.
`short-circuit.m4a` and `jungle-jargon.m4a` were removed.

The `seamless_loop` cuts from the pack are used rather than the plain versions:
they end where they begin, so the join between tracks lands on a musical edge
instead of a fade-out tail.

## Adding or replacing a track

Encode from the source to AAC in an MP4 container — the one format every target
browser decodes — and give it a kebab-case name:

```bash
ffmpeg -i "source.ogg" -vn -c:a aac -b:a 96k -ar 44100 -ac 2 \
  -movflags +faststart \
  -metadata title="Track Title" -metadata artist="elevchyt" \
  -metadata copyright="CC BY 4.0" \
  track-title.m4a
```

Then add it to `musicPlaylist` in `content/music.ts`.

- **Keep it light.** Every track ships in the repository and over the wire.
- **Mix it low.** The player's resting gain is the MID notch of the Sound
  Select level (`src/lib/music-volume.ts` — LO/MID/HI, spaced by ear and
  capped well under unity) so the music sits under the synthesized menu tones.
  Master accordingly rather than relying on that gain to rescue a hot file.
- **Ship only what you have the rights to ship.** This repository and the
  deployed site are both public. Original work or an explicitly licensed track
  only, and record the licence here and in `content/music.ts`.

## Missing files are not an error

Any track whose file is absent 404s, is skipped, and the rotation moves on. If
none of them resolve, the toggle still works and simply produces silence —
nothing is thrown and nothing is logged. That behaviour is deliberate, so the
control never lies about its own state, and it is covered by `tests/bgm.test.ts`.

## Serving

Files here are served from our own origin at `/audio/…`. The site's CSP is
`default-src 'self'` with no external hosts, so an externally hosted track
would simply be blocked — self-hosting is a requirement, not a preference.
