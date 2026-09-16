# Surya Racing Portfolio

A personal portfolio built as a late-1990s console racing frontend — a world map of pavilions, each mapping to a facet of the work: a garage of projects rendered in 3D, career history as race seasons, skills as license tiers, a café with a guest terminal, and photography in the darkroom.

Live at **[suryapugaz.com](https://suryapugaz.com)**.

## Stack

- **Next.js** (App Router) + **TypeScript**
- **React Three Fiber** + drei for 3D scenes, modelled in Blender and exported as compressed glTF
- **Tailwind v4**, with the racing aesthetic expressed through design tokens rather than one-off values
- Content as typed TS data files under `content/` — no CMS, no database
- **pnpm**

Deployed to **Cloudflare Workers** via the [OpenNext](https://opennext.js.org/cloudflare) adapter. Merging to `main` builds and ships to production automatically.

## Development

```bash
pnpm install
pnpm dev          # local dev server
pnpm test         # vitest
pnpm lint         # eslint
pnpm build        # production Next.js build
```

To build and deploy the Worker itself:

```bash
pnpm cf:preview   # build and run the Worker locally
pnpm cf:deploy    # build and deploy to Cloudflare
```

Note that `pnpm exec opennextjs-cloudflare build` writes `.open-next/`, and wrangler writes `.wrangler/`. Both are gitignored and excluded from linting.

## Design

`DESIGN.md` is the source of truth for the visual system — palette, bevel ramps, typography, and component vocabulary, captured from the shipped implementation rather than from intentions. Read it before changing anything visual.

Typography is Source Serif 4 for page titles, Pixelify Sans for navigation and labels, Satoshi for body text, and Saira for numeric readouts. All self-hosted; no external font CDNs, which keeps the `'self'`-only CSP intact.

## License

The code is available for reference. The written content, photography, and 3D assets are not licensed for reuse.
