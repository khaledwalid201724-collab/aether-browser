#!/usr/bin/env bash
# Prepare the Aether website locally and serve it.
# Usage: ./site/serve.sh [port]      (default: 8000)
set -euo pipefail

SITE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SITE/.." && pwd)"
DL="$SITE/downloads"
PORT="${1:-${PORT:-8000}}"

mkdir -p "$DL/extensions"

echo "==> Writing SHA256SUMS"
(
  cd "$ROOT/dist"
  sha256sum Aether-x86_64.AppImage Aether-Android-universal.apk > "$DL/SHA256SUMS"
)

echo "==> Packing extension ZIPs"
ROOT="$ROOT" python3 - <<'PY'
import os, pathlib, zipfile
root = pathlib.Path(os.environ['ROOT'])
out = root / 'site/downloads/extensions'
for src in sorted((root / 'extensions').iterdir()):
    if not src.is_dir() or not (src / 'manifest.json').exists():
        continue
    dest = out / f'{src.name}.zip'
    with zipfile.ZipFile(dest, 'w', zipfile.ZIP_DEFLATED) as zf:
        for f in sorted(src.rglob('*')):
            if f.is_file():
                zf.write(f, f.relative_to(src))
    print('   ', dest.name)
PY

echo
echo "Aether website → http://localhost:$PORT/"
echo "Press Ctrl+C to stop."
python3 -m http.server "$PORT" --directory "$SITE"
