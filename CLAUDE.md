# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Surya Racing Portfolio" — a Gran Turismo / Ridge Racer Type 4–inspired personal portfolio site. The home page is a GT-style world map with pavilions, each mapping to a portfolio facet:

- **Career / Story Mode** — education & work as seasons/events
- **Garage** — projects as cars with 3D inspection and spec sheets
- **License Center** — skills as license tiers backed by evidence
- **Missions** — hackathons & challenges as mission packs
- **Scapes** — photography galleries
- **GT Café** — 3D café scene with "Menu Books" (curated visitor journeys for founders/VCs/hiring managers)
- **Online Lobby** — contact & social links as a multiplayer lobby

**Master reference docs (read these before any feature work):**
The `Docs/` folder is **local-only and gitignored** — this repo is public, so never commit or quote these docs wholesale into tracked files.
- `Docs/portfolio-prd.md` — requirements, epics E1–E10, sprint plan, story/acceptance-criteria templates, orchestration protocol
- `Docs/portfolio-ux.md` — visual language, page-by-page metaphors, motion rules, accessibility constraints. Single source of truth for all design decisions.

## Stack (decided — do not substitute)

- **Next.js (App Router) + TypeScript**, deployed on Vercel
- **React Three Fiber + drei** for all 3D scenes (never vanilla Three.js glue)
- **Tailwind v4** with design tokens as CSS custom properties (colors, type scale, spacing, easing) — the racing aesthetic is expressed via tokens, never one-off CSS values
- **Content:** typed TS data files in a `content/` directory (e.g., `seasons.ts`, `cars.ts`, `missions.ts`, `licenses.ts`, `menu-books.ts`, `photos.ts`). No CMS, no backend — the site is read-mostly static.
- **pnpm** as package manager

## Commands

Once scaffolded (`pnpm create next-app`), the standard commands are:

```bash
pnpm dev          # local dev server
pnpm build        # production build (must pass before any PR)
pnpm lint         # eslint
pnpm test         # vitest unit tests
pnpm test -- path/to/file.test.ts   # single test file
pnpm exec playwright test           # e2e tests
```

Update this section with the real scripts as soon as `package.json` exists.

## Architecture

### Pavilion structure

Each pavilion is a route under `app/` with a shared shell (section title, content zone, context zone). Screens follow the 2–3 zone composition from the UX doc: left nav/filters, center primary content, right/bottom contextual preview (3D scene, stats, details). Content links across pavilions (career events ↔ garage cars ↔ missions ↔ license tests ↔ menu book tasks) — model these as typed cross-references by id/slug in the content files.

### 3D asset pipeline (Blender → glTF → R3F)

- Environments and models (GT Café scene, garage cars, intro car) are **modeled in Blender** (Blender MCP available for iteration), exported as compressed `.glb` (Draco/meshopt), and converted to typed components with `gltfjsx`.
- Lighting for the café is **baked in Blender** — matches the warm pre-rendered PS1/PS2 look and is cheaper at runtime.
- Commit `.glb` files; keep `.blend` sources in `assets-src/` (not shipped).
- Camera moves, hover states, the intro drift animation, and data binding are done in R3F/drei — never baked into the asset.
- PS1 flavor lives in the 3D scenes only: flat/Lambert (Gouraud-like) shading, low-poly geometry, indexed-color/low-res textures, optional dithering. The 2D UI stays crisp and modern.
- Every 3D scene is an isolated, lazy-loaded component with clear data props. Heavy scenes must be code-split per route.

### Design constraints (from the UX doc — enforced, not optional)

- Palette: R4 warm yellow (#FAB217) primary, warm greys/off-whites, dark charcoal text, **one** accent max. No neon/cyberpunk gradients, no glitch effects.
- Typography: 3–4 sizes per page max; body ≥16px; nothing below 12px.
- Motion: hard cuts, straight-line slides, subtle fades; 150–250ms with mechanical easing (`cubic-bezier(0.16, 1, 0.3, 1)`); no bouncy/elastic easing. Intro drift animation runs once on first load only. Respect `prefers-reduced-motion` everywhere.
- Accessibility: WCAG AA contrast (careful with text on yellow), semantic landmarks/headings, full keyboard navigation across all pavilions.

### Security & performance

- No secrets in the repo — Vercel environment variables only.
- Plan for CSP early: no inline scripts/styles that would block strict CSP.
- Optimize Core Web Vitals; lazy-load Three.js scenes; code-split per pavilion.

## Git workflow

- `main` is always deployable and mirrors Vercel production. **Never commit directly to `main`** — no agent edits `main`.
- Feature branches per 1–2 user stories: `feature/sprint-01-shell-career`, `feature/garage-basic`, etc.
- Flow: feature branch → PR → review → merge. Before coding, fetch and rebase/merge `origin/main` into the feature branch.
- Parallel agent work uses git worktrees under `.worktrees/` (gitignored): `git worktree add .worktrees/feature-garage -b feature/garage main`.
- Commit format: `<type>: <description>` (feat, fix, refactor, docs, test, chore, perf, ci).

## Orchestration protocol (from PRD)

- **Certainty threshold:** only implement/modify code when ≥95% certain about correctness, compatibility, and security impact. Below that, do not guess — run `/grill-me` (deep Q&A with the developer) until clarified.
- Sprint kickoffs and ambiguous stories start with a `/grill-me` session.
- Task routing: Opus-class models for complex work (architecture, nontrivial Three.js/WebGL, security-sensitive features, major refactors); Sonnet-class for UI wiring, copy, small refactors, tests, docs. **Never use Haiku on this project.**
- After implementing a story: run tests + lint, map changes back to the story's acceptance criteria, open a PR with that mapping in the description.
