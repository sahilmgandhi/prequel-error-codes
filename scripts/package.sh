#!/usr/bin/env bash
set -euo pipefail

NAME="prequel-error-codes"
OUTPUT="../${NAME}.zip"

cd "$(dirname "$0")/.."

rm -f "$OUTPUT"

zip -r "$OUTPUT" \
    manifest.json \
    background.js \
    content.js \
    styles.css \
    img/ \
    --exclude "*.DS_Store" "*.gitkeep"

echo "Created $OUTPUT"
