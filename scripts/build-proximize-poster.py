"""Builds public/terminal/proximize/poster.webp from the source teaser artwork.

WHY THIS EXISTS: the generated source poster carries the real PlayStation logo
and wordmark plus a Sony/Polyphony disclaimer line. This repo and the deployed
site are public, and the project's design rule is colours and patterns only,
never real brand marks (see CLAUDE.md). This script performs — and documents —
exactly that removal, so the provenance of the shipped asset is auditable:

  1. erases the PlayStation mark from the platform slot,
  2. erases the "Not affiliated with ... Polyphony Digital Inc." line, which
     only existed to disclaim the mark being removed (the two remaining
     fine-print lines are the project's own trademark notice and the "this is
     a conceptual teaser" note, both kept),
  3. drops the site's own "SP / PORTFOLIO SYSTEM" enamel badge into the
     vacated slot — the same lockup as the boot intro's studio mark, giving
     the ad the reading "coming to the Surya Pugazhenthi Portfolio System",
  4. encodes WebP q82 (2.15 MB PNG -> ~88 KB).

THE SOURCE IS DELIBERATELY NOT COMMITTED. Committing a 2 MB PNG containing the
trademark we just stripped would defeat the point. Keep it locally and pass
its path as argv[1]; only the output belongs in git.

Requires Pillow, which is NOT a project dependency (this repo carries no
image-processing deps — scripts/generate-scapes-placeholders.mjs emits SVG by
hand). Run it from a throwaway venv:

    python3 -m venv /tmp/poster-venv
    /tmp/poster-venv/bin/pip install Pillow
    /tmp/poster-venv/bin/python scripts/build-proximize-poster.py ~/path/to/source.png

Colours are the site tokens from src/app/globals.css; the badge geometry
mirrors .badge-rim / .badge-face.
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
OUT = ROOT / "public" / "terminal" / "proximize" / "poster.webp"
FONT_TTF = ROOT / "src" / "fonts" / "Saira-Regular-OG.ttf"

GT_ORANGE = (0xEF, 0x81, 0x00)   # --color-gt
ASPHALT = (0x0A, 0x0A, 0x0B)     # --color-asphalt
FACE_TOP = (0xD4, 0xD6, 0xDA)    # .badge-face gradient start
FACE_BOT = (0x9F, 0xA3, 0xAA)    # .badge-face gradient end
SILVER = (0xA4, 0xA7, 0xAD)

# Regions measured off the 1085x1450 source by scanning for bright row bands.
LOGO_BOX = (470, 1160, 630, 1290)
DISCLAIMER_LINE = (0, 1336, 1085, 1354)

BADGE_SIZE = 92
BADGE_RIM = 5
BADGE_TOP = 1172
CAPTION = "PORTFOLIO SYSTEM"
CAPTION_TRACKING = 4


def sample_bg(im, box):
    """Background colour just outside a region. The poster's black is not pure
    #000 — it carries a faint cloud gradient — so a flat fill would band."""
    x0, y0, x1, y1 = box
    w, h = im.size
    px = im.load()
    vals = [
        px[max(0, min(w - 1, x)), y]
        for x in (x0 - 20, x1 + 20)
        for y in range(y0, min(y1, h), 4)
    ]
    vals.sort(key=sum)
    return vals[len(vals) // 2]


def build_badge():
    """The SP enamel badge: orange rim, silver gradient face, black monogram."""
    badge = Image.new("RGB", (BADGE_SIZE, BADGE_SIZE), GT_ORANGE)
    draw = ImageDraw.Draw(badge)
    draw.rounded_rectangle((0, 0, BADGE_SIZE - 1, BADGE_SIZE - 1), radius=5, fill=GT_ORANGE)

    inner = BADGE_SIZE - BADGE_RIM * 2
    face = Image.new("RGB", (inner, inner))
    fd = ImageDraw.Draw(face)
    for y in range(inner):
        t = y / max(1, inner - 1)
        fd.line(
            [(0, y), (inner, y)],
            fill=tuple(round(FACE_TOP[i] + (FACE_BOT[i] - FACE_TOP[i]) * t) for i in range(3)),
        )
    mask = Image.new("L", (inner, inner), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, inner - 1, inner - 1), radius=6, fill=255)
    badge.paste(face, (BADGE_RIM, BADGE_RIM), mask)

    font = ImageFont.truetype(str(FONT_TTF), 52)
    draw = ImageDraw.Draw(badge)
    box = draw.textbbox((0, 0), "SP", font=font)
    draw.text(
        (
            (BADGE_SIZE - (box[2] - box[0])) / 2 - box[0],
            (BADGE_SIZE - (box[3] - box[1])) / 2 - box[1],
        ),
        "SP",
        font=font,
        fill=ASPHALT,
    )
    return badge


def main():
    if len(sys.argv) < 2:
        sys.exit("usage: build-proximize-poster.py <source.png>  (see module docstring)")

    im = Image.open(sys.argv[1]).convert("RGB")
    width, _ = im.size
    draw = ImageDraw.Draw(im)

    draw.rectangle(LOGO_BOX, fill=sample_bg(im, LOGO_BOX))
    draw.rectangle(DISCLAIMER_LINE, fill=sample_bg(im, DISCLAIMER_LINE))

    im.paste(build_badge(), ((width - BADGE_SIZE) // 2, BADGE_TOP))

    # Tracked caption; PIL has no letter-spacing, so draw glyph by glyph.
    cap_font = ImageFont.truetype(str(FONT_TTF), 13)
    widths = [draw.textlength(c, font=cap_font) for c in CAPTION]
    total = sum(widths) + CAPTION_TRACKING * (len(CAPTION) - 1)
    x = (width - total) / 2
    y = BADGE_TOP + BADGE_SIZE + 12
    for char, w in zip(CAPTION, widths):
        draw.text((x, y), char, font=cap_font, fill=SILVER)
        x += w + CAPTION_TRACKING

    OUT.parent.mkdir(parents=True, exist_ok=True)
    im.save(OUT, "WEBP", quality=82, method=6)
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
