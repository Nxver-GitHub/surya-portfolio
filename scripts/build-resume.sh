#!/usr/bin/env bash
# Rebuild the public résumé PDF from assets-src/resume/main.tex.
#
# Requires Tectonic (`brew install tectonic`). The source is the web build of
# the résumé: no phone number, no street address. Keep it that way — this
# repo and the output file are public. tests/resume.test.ts guards both.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/assets-src/resume"
OUT="$ROOT/public/resume"
NAME="Surya_Pugazhenthi_Resume.pdf"
TMP="$(mktemp -d)"

command -v tectonic >/dev/null || { echo "tectonic not found: brew install tectonic" >&2; exit 1; }

tectonic --chatter minimal -o "$TMP" "$SRC/main.tex"
mkdir -p "$OUT"
mv "$TMP/main.pdf" "$OUT/$NAME"
rm -rf "$TMP"
echo "wrote $OUT/$NAME"
