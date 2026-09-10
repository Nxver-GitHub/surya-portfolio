---
name: Surya Racing Portfolio
description: A late-1990s console racing frontend with distinct portfolio destinations.
colors:
  asphalt: "#0b101b"
  panel: "#171e2b"
  steel: "#505a6c"
  chrome: "#f0f0e9"
  ink: "#d6d9e0"
  silver: "#bfc4cf"
  gt: "#e5a400"
  gt-bright: "#ffbf19"
  accent: "#d82c35"
  metal-control: "#aeb4c0"
  map-metal: "#adb3bf"
  selected-control: "#ffb900"
  # Bevel ramps. Every control is stamped, not flat: a light top/left edge, a
  # dark bottom/right edge and an inset keyline, one triplet per surface. These
  # are the era's depth grammar, not palette drift — see "Elevation & Depth".
  panel-bevel-light: "#697386"
  panel-bevel-light-alt: "#6c7586"
  panel-bevel-dark: "#080c14"
  panel-keyline: "#252f40"
  metal-bevel-light: "#e1e4eb"
  metal-bevel-dark: "#444b5c"
  metal-keyline: "#818a9c"
  metal-hover: "#ccd1da"
  metal-hover-bevel-light: "#f4f6f9"
  metal-hover-keyline: "#98a0b0"
  map-bevel-light: "#edf0f4"
  map-bevel-dark: "#414754"
  map-keyline: "#7c8494"
  map-drop-shadow: "#060a12"
  map-locked: "#7f8690"
  amber-bevel-light: "#ffe59a"
  amber-bevel-dark: "#724b00"
  amber-keyline: "#d39700"
  amber-selected-bevel-light: "#ffe694"
  amber-selected-bevel-dark: "#8c6200"
  amber-hover: "#ffcb40"
  # Rules, dividers and secondary surfaces
  rule-strong: "#757e91"
  rule-mid: "#636f84"
  rule-soft: "#586377"
  rule-hairline: "#343f51"
  screen-border: "#252d3e"
  tile-surface: "#1c2534"
  tile-border: "#657084"
  badge-face-top: "#d4d6da"
  badge-face-bottom: "#9fa3aa"
  scrollbar-thumb: "#8f99aa"
  scrollbar-track: "#111723"
  plate-ink: "#090e18"
  map-ink: "#e0e3ec"
  map-ink-alt: "#e4e6ec"
  pointer-white: "#ffffff"
  # CRT phosphor. The café terminal is a green-phosphor tube seen inside the
  # scene, so it is deliberately outside the menu palette — a monitor does not
  # match the interface it sits in.
  phosphor-ground: "#030c07"
  phosphor-ground-deep: "#020604"
  phosphor-text: "#7dff9b"
  phosphor-dim: "#9aa6a0"
  phosphor-black: "#050505"
  phosphor-tube: "#03140a"
  phosphor-glow: "#147838"
  # Café interior. The room is warm wood and lamplight, its own world beside
  # the midnight console chrome.
  cafe-wood: "#23201a"
  cafe-shadow: "#141311"
  cafe-lamp: "#c9a54a"
  cafe-dust: "#786e5a"
  # Scrims. Neutral black at low alpha for overlays, drop shadows and vignettes
  # — depth, not hue.
  scrim: "#000000"
typography:
  title:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "clamp(2.6rem, 4.6vw, 4.6rem)"
    fontWeight: 900
    lineHeight: 1.02
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Satoshi, sans-serif"
  label:
    fontFamily: "Pixelify Sans, Saira, sans-serif"
  numeric:
    fontFamily: "Saira, sans-serif"
  # The café's CRT terminal is a diegetic machine, not site chrome: a terminal
  # renders in the system monospace, so it uses the platform stack rather than
  # a brand face.
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
rounded:
  control: "0px"
components:
  plate:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.control}"
  plate-selected:
    backgroundColor: "{colors.selected-control}"
    rounded: "{rounded.control}"
  back-link:
    backgroundColor: "{colors.metal-control}"
    textColor: "{colors.asphalt}"
    rounded: "{rounded.control}"
---

# Design System: Surya Racing Portfolio

## Overview

**Last updated:** 2026-09-09. Captured from the completed implementation.

**Creative North Star: "Original-console racing frontend"**

The approved v2 reference establishes chunky terrain, bitmap-inspired controls, silver bevels, amber selection and compact serif titles. The user's subsequent instruction extends this style across existing pages and explicitly retains the GTME dirt spur; that instruction supersedes the reference generation prompt's seven-destination wording.

The map is a raster landscape with semantic HTML navigation. Other destinations keep their own scene and content composition.

> The approved mockup, its generation metadata, the product brief and the implementation audit all live in the repository's local-only `Docs/` directory. This repository is public, so they are deliberately not linked or reproduced here.

**Key Characteristics:**

- Period graphics with crisp, independently rendered interface text.
- Quiet midnight surfaces, mechanical controls and clear selected states.
- Distinct destinations with readable evidence and direct navigation.

## Colors

Primary amber uses `gt` for text selection, `gt-bright` for emphasis and focus, and `selected-control` for active plates and map entry. Red `accent` draws the short title rule. Neutral `asphalt` and `panel` form the screen layers; `chrome`, `ink` and `silver` carry the reading hierarchy. `steel` separates regions; the two metal colors distinguish back controls and map plates.

Beyond the base palette, each surface carries a three-value bevel ramp — light edge, dark edge, inset keyline — because every control in this system is stamped rather than filled. The ramps are listed above so they read as a deliberate part of the system; a literal bevel colour that is not in that list is drift and should be reconciled, not added ad hoc.

Three sub-worlds sit outside the menu palette on purpose, and are listed above so they read as intentional rather than as drift: the **CRT phosphor** greens (the café terminal is a tube seen inside the scene — a monitor does not match the interface around it), the **café interior's** warm wood and lamplight, and neutral **scrims** used at low alpha for depth rather than hue. Per-item accents in content — destination liveries in [liveries.ts](content/liveries.ts) and the Menu Book colors in [menu-books.ts](content/menu-books.ts) — are content data, not system colors, and each carries its own value by design.

These values are extracted from [globals.css](src/app/globals.css) and [console.css](src/app/console.css). Existing destination liveries and source media retain their own colors.

## Typography

Source Serif 4 gives page titles their heavy menu character. Pixelify Sans is self-hosted and carries navigation, compact labels and map controls. Satoshi remains the body face; Saira handles numeric readouts and small display text where configured. Font loading is defined in [fonts.ts](src/app/fonts.ts).

The home title has its own responsive sizing: 60px in the desktop height-aware layout and 42px on phones. Map labels scale from 15px to 24px on desktop; mobile map glyphs are 17px. Reading regions use a 1.65 line height and constrain paragraphs and list items to 72ch where the reading wrapper is applied.

**The Readable Evidence Rule.** Pixelation belongs to scenes and selected interface roles; never rasterize prose, links or source photography to imitate the era.

## Layout

Interior pages share a centered shell capped at 1600px. Their layouts remain purpose-specific: Career seasons and detail views, Garage car selection, Café room/menu books/terminal, License Center trophy wall, Missions event selector, Scapes photo browser, Lobby contact room, and Special Stage rally briefing/case studies. No pages were added.

The home landscape uses an uncropped 4:3 coordinate plane capped at 1440px. Desktop width also responds to viewport height when width is at least 1100px and height at least 700px, deriving the map from the space left over after the chrome: `(100dvh - 354px) * 4 / 3`. That 354px is the header, information strip, control strip and HUD totals added up — **if the header's height changes, this constant has to change with it**, or the HUD drops below the fold and the desktop screen starts to scroll.

The no-scroll guarantee is bounded, and honestly so: a `min-width: 720px` floor stops the map shrinking past legibility, which means it holds on viewports about **940px tall and up**. Shorter desktop windows scroll by a few pixels, and shorter still by more. That is the floor doing its job rather than a bug to chase — closing the gap would mean shrinking the map below a usable size. The chrome also breathes slightly with width, because the information strip's caption wraps to a second line on narrow screens, so the constant is a close fit rather than an exact one.

The title is the other half of this: it is sized in `cqi` against the screen container, never against the viewport, because the container's width here comes from viewport *height*. Anything in this header sized in `vw` will disagree with the box it lives in. Eight independently positioned controls include the Special Stage dirt spur.

Below 768px, map labels become 44px glyph controls and a two-column named directory follows the information strip. Interior shell padding becomes 16px. Garage stacks its selector, fixed 330px scene and details. The trophy wall moves from three columns to two below 1200px, then one below 768px, using shrinking tracks and wrapping evidence.

## Elevation & Depth

Depth is structural: two-pixel light top/left and dark bottom/right bevels, inset keylines and hard text shadows. The map plates add a hard offset shadow. Selected plates turn amber; selected map destinations add a white pointer and desktop amber brackets. Scene frames invert the bevel to read as inset screens.

Existing CRT presentation remains, but the former global graph-paper texture is removed. Existing Garage and Café WebGL scenes use [ConsoleResolution.tsx](src/components/gt/ConsoleResolution.tsx) to cap the framebuffer at 480×360 while preserving aspect ratio; DOM overlays stay at native resolution. Source photography is preserved.

## Shapes

Shared plates, back links and license badges have square corners. Title rules are short and red. Triangular selection cursors and bevels are intentional period features. Do not replace them with rounded contemporary cards or remove them solely because a generic visual detector flags border triangles.

## Components

- **Destination map:** [CircuitMap.tsx](src/components/world-map/CircuitMap.tsx) overlays links and locked-state buttons on the terrain image. Hover/focus updates the live information strip; arrow keys, Home and End move selection; Enter follows an open destination. Café is the initial selection. Scapes remains locked on the map while its existing direct route remains available. Label anchors live in [pavilions.ts](content/pavilions.ts) as percentages of the map canvas, tied to the landmarks drawn in the art — they belong to the content, not the component, and move only when the terrain is regenerated. The terrain itself ships as a 256-colour indexed PNG and is served `unoptimized`: indexed colour is what the era actually used, and it keeps Next from re-encoding away the nearest-neighbour edges and ordered dithering the whole art direction rests on.
- **System mark:** [GtMark.tsx](src/components/gt/GtMark.tsx) is the enamel "SP" badge — amber rim, flat enamel face — held in the top-left corner of every screen, the way a console game's logo persists across its menus. It reuses the badge the boot sequence seats under a spotlight ([IntroMonogram](src/components/boot/intro/IntroMonogram.tsx)), so the mark on the title card is the mark that follows the visitor through the pavilions. It is chrome, not navigation: no link, no tab stop, `aria-hidden`. Every screen already carries a real route home. Pixelify's cap-height sits low, so the glyph runs larger than a conventional face would to fill the enamel. On phones it takes the row above the title, because the OPTIONS control holds the top-right corner.
- **Driver card:** [DriverCard.tsx](src/components/world-map/DriverCard.tsx) is the world map's identity plate and the only place the visitor's name appears on that screen. Brushed steel at rest; its hover is a brightened steel with an amber left keyline, deliberately **not** the amber fill used for a selected map destination, so the card never reads as a place you can drive to. The portrait's intrinsic size must lead its CSS box — it is the one real face on the landing screen.
- **Plates and back links:** square, beveled controls with amber selected states. Shared page buttons and back links have a 44px minimum height. Global keyboard focus uses a two-pixel amber outline with a four-pixel offset; map control focus is white.
- **Titles and reading panels:** shared serif title/red rule unify pages without replacing their interaction model. Preserve destination-specific content hierarchy and original media.
- **Garage viewport:** bounded height and top alignment keep the vehicle visible instead of stretching the scene alongside a long specification sheet.
- **Entry and options:** the intro uses a native modal dialog and a real central Press Start button. Options use ordinary buttons with `aria-pressed` state. Preserve sound preferences and the existing controller integration.
- **Motion:** shared mechanical timings are 150ms, 200ms and 250ms with `cubic-bezier(0.16, 1, 0.3, 1)`. Some intro sequences have separate timings. Retain the implemented reduced-motion alternatives; do not assume every effect uses the shared scale.

## Do's and Don'ts

- **Do** preserve the world-map geography, eight destinations and GTME dirt spur.
- **Do** keep labels and navigation semantic, focus-visible and readable at phone widths.
- **Do** retain page identities, actual portfolio evidence and source media.
- **Do** verify settled scene rendering and narrow-width reflow after visual changes.
- **Don't** replace the map with a sidebar or introduce photorealistic remaster styling.
- **Don't** turn every destination into the same card layout.
- **Don't** confuse intentional period bevels and cursors with accidental decoration.
