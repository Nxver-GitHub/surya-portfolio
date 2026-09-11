# Menu theme

The looping menu track the OPTIONS → MUSIC toggle plays. **It is not in the
repository yet** — the track is auditioned separately and lands here in a
follow-up commit. Until then the toggle works and produces silence.

## Expected files

The player (`src/lib/bgm.ts`) tries these paths in order and uses the first one
that loads:

| Path                       | Format                | Notes                                   |
| -------------------------- | --------------------- | --------------------------------------- |
| `public/audio/menu-theme.m4a`  | AAC-LC in MP4     | Primary. The one format every target browser decodes. |
| `public/audio/menu-theme.opus` | Opus in Ogg       | Optional smaller alternative; only reached if the `.m4a` is absent. |

If neither exists, the fetch 404s, the loader returns `null`, and nothing is
logged or thrown. That is the designed state while the track is being chosen,
not a failure to fix.

## Preparing a track

- **Loop point matters more than length.** The file is decoded once into an
  `AudioBuffer` and looped by an `AudioBufferSourceNode`, which restarts at
  sample zero with no gap — so the *audio* has to loop cleanly. Trim so the
  last sample leads musically back into the first, with no trailing reverb tail
  and no leading silence.
- **Keep it small.** It is fetched on the first toggle and held in memory
  decoded. A 60–90 second loop at ~96–128 kbps is the target; a whole-file
  download over a slow connection is the only cost the visitor pays.
- **Mix it low.** The player applies a 0.5 resting gain so the theme sits under
  the synthesized menu tones. Master accordingly rather than relying on that
  gain to rescue a hot file.
- **Ship what you have the rights to ship.** This repository and the deployed
  site are public. Original composition or an explicitly licensed track only,
  with the license recorded alongside the other credits.

## Encoding

```bash
# AAC-LC in MP4 — the primary source
ffmpeg -i source.wav -c:a aac -b:a 128k -movflags +faststart menu-theme.m4a

# Opus in Ogg — optional
ffmpeg -i source.wav -c:a libopus -b:a 96k menu-theme.opus
```

## Serving

Files here are served from our own origin at `/audio/…`. The site's CSP is
`default-src 'self'` with no external hosts, so an externally hosted track
would simply be blocked — self-hosting is a requirement, not a preference.
