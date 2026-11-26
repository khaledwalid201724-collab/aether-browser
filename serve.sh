#!/usr/bin/env bash
# Prepare the Aether website locally and serve it.
# Usage: ./serve.sh [port]      (default: 8000)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DL="$ROOT/downloads"
PORT="${1:-${PORT:-8000}}"

mkdir -p "$DL/extensions"

echo "==> Writing SHA256SUMS"
(
  cd "$ROOT/dist" 2>/dev/null || exit 0
  files=(Aether-x86_64.AppImage)
  for extra in Aether-Windows-x86_64.zip Aether-Windows-x86_64-setup.exe Aether-Android-universal.apk; do
    [[ -f "$extra" ]] && files+=("$extra")
  done
  ((${#files[@]} > 0)) && sha256sum "${files[@]}" > "$DL/SHA256SUMS"
)

echo "==> Packing extension ZIPs"
ROOT="$ROOT" python3 - <<'PY'
import os, pathlib, zipfile
root = pathlib.Path(os.environ['ROOT'])
out = root / 'downloads/extensions'
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
python3 -m http.server "$PORT" --directory "$ROOT"
