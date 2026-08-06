"""Extracts the two cinematic frame assets from the source teaser artwork.

The teaser takeover (terminal/teaser/) plays composed beats on black and needs
the cover-car and the PROXIMIZE lockup as standalone images:

    public/terminal/proximize/car.webp     frame 7 — the car under the cover
    public/terminal/proximize/lockup.webp  frame 8 — P-mark + wordmark + rule

WHY LUMINANCE-KEYED ALPHA: both elements sit on the poster's dark *gradient*
sky, not on pure black. A plain rectangular crop composited onto the
cinematic's black background would show a visible seam where the crop's dark
blue meets true black. Feathering the rectangle's edges would work for the
lockup but not the car, which spans nearly the full poster width — the feather
would eat its nose and tail.

Instead alpha is derived from luminance: bright pixels stay opaque, dark ones
go transparent. Both elements are bright subjects on a dark field, and the
destination background IS black, so this is effectively lossless — a mid-tone
at 50% alpha over black renders the same value it had over near-black — while
producing perfectly clean edges at any position or scale.

Requires Pillow (not a project dependency — this repo carries no image libs).
Run from a throwaway venv, same as build-proximize-poster.py:

    /tmp/poster-venv/bin/python scripts/build-proximize-frames.py ~/path/to/source.png

The source art is deliberately not committed (it still carries the PlayStation
mark this project strips). Only the outputs belong in git.
"""

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "terminal" / "proximize"

# Boxes measured off the 1085x1450 source by scanning for bright row bands,
# padded so no lit pixel is clipped. See the band map in the PR description.
#   lockup: P-mark + PROXIMIZE wordmark + tricolore + the strapline under it,
#           kept together because they are one brand lockup.
#   car:    the covered car and its ground reflection.
REGIONS = {
    "lockup": (232, 496, 898, 680),
    "car": (8, 762, 1078, 1078),
}

# Luminance below this is fully transparent; above the upper bound fully
# opaque; between, alpha ramps linearly. The floor sits just above the sky
# gradient's brightest value so the background keys out cleanly.
ALPHA_FLOOR = 26
ALPHA_CEIL = 116


def keyed(im):
    """RGBA copy whose alpha is a ramped function of luminance."""
    rgb = im.convert("RGB")
    lum = rgb.convert("L")
    span = ALPHA_CEIL - ALPHA_FLOOR
    alpha = lum.point(
        lambda v: 0 if v <= ALPHA_FLOOR else (255 if v >= ALPHA_CEIL else round((v - ALPHA_FLOOR) * 255 / span))
    )
    out = rgb.convert("RGBA")
    out.putalpha(alpha)
    return out


def main():
    if len(sys.argv) < 2:
        sys.exit("usage: build-proximize-frames.py <source.png>  (see module docstring)")

    src = Image.open(sys.argv[1])
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for name, box in REGIONS.items():
        asset = keyed(src.crop(box))
        path = OUT_DIR / f"{name}.webp"
        # method=6 is the slowest/best encoder setting; these are built once.
        asset.save(path, "WEBP", quality=88, method=6, exact=True)
        print(f"wrote {path.relative_to(ROOT)}  {asset.size[0]}x{asset.size[1]}  {path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
