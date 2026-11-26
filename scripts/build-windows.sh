#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

REVISION="${REVISION:-1755237}"
VERSION="${VERSION:-160.0.8185.0}"
APP_VERSION="${APP_VERSION:-1.0.0}"
PYTHON="${PYTHON:-python3}"
BASE="${BASE:-https://storage.googleapis.com/chromium-browser-snapshots}"
DL="$ROOT/work/downloads"
TOOLS="$ROOT/work/tools"
WORK="$ROOT/work"
CHROME="$WORK/chrome-win"
APP="$WORK/Aether"
DIST="$ROOT/dist"

mkdir -p "$DL" "$TOOLS" "$DIST" "$WORK/win"

win_path() {
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -m "$1"
  else
    printf 'Z:%s\n' "$(realpath "$1")"
  fi
}

echo "==> [1/8] Fetching upstream Chromium Win_x64 (revision $REVISION)"
ZIP="$DL/chrome-win.zip"
if [[ ! -s "$ZIP" ]]; then
  curl -fL --retry 3 --max-time 1800 -o "$ZIP" \
    "$BASE/Win_x64/$REVISION/chrome-win.zip"
fi

echo "==> [2/8] Extracting Chromium"
rm -rf "$CHROME"
7z x -y -o"$WORK" "$ZIP" >/dev/null
if [[ ! -x "$CHROME/chrome.exe" && ! -f "$CHROME/chrome.exe" ]]; then
  echo "chrome.exe missing after extraction" >&2
  exit 1
fi

echo "==> [3/8] Regenerating assets, filters and themes"
$PYTHON scripts/generate-assets.py
$PYTHON scripts/generate-filters.py
$PYTHON scripts/generate-themes.py

echo "==> [4/8] Rebranding locale and resource paks"
$PYTHON scripts/patch-windows-paks.py --in-place \
  "$CHROME"/locales/*.pak \
  "$CHROME/resources.pak" \
  "$CHROME/chrome_100_percent.pak" \
  "$CHROME/chrome_200_percent.pak"

echo "==> [5/8] Replacing product logos and embedded strings"
$PYTHON scripts/patch-windows-icons.py "$CHROME"
$PYTHON scripts/patch-windows-binaries.py "$CHROME/chrome.exe" "$CHROME/chrome.dll"

echo "==> [6/8] Preparing Aether application directory"
rm -rf "$APP"
mkdir -p "$APP/config" "$APP/startpage" "$APP/profile-template/Default"

for file in \
  chrome.exe chrome.dll chrome_elf.dll chrome_wer.dll \
  chrome_proxy.exe chrome_pwa_launcher.exe notification_helper.exe \
  elevation_service.exe elevated_tracing_service.exe eventlog_provider.dll \
  setup.exe D3DCompiler_47.dll dxcompiler.dll libEGL.dll libGLESv2.dll \
  vk_swiftshader.dll vulkan-1.dll icudtl.dat v8_context_snapshot.bin \
  resources.pak chrome_100_percent.pak chrome_200_percent.pak \
  vk_swiftshader_icd.json First Run "$VERSION.manifest"; do
  [[ -f "$CHROME/$file" ]] && cp "$CHROME/$file" "$APP/"
done
cp -a "$CHROME/locales" "$APP/"
cp -a "$CHROME/IwaKeyDistribution" "$APP/" 2>/dev/null || true
cp -a "$CHROME/MEIPreload" "$APP/" 2>/dev/null || true

cp -a "$ROOT/extensions/." "$APP/extensions/"
cp "$ROOT/config/flags.txt" "$APP/config/flags.txt"
cp "$ROOT/config/aether.conf" "$APP/aether.conf"
cp "$ROOT/assets/startpage/index.html" "$APP/startpage/index.html"
cp "$ROOT/assets/startpage/modern.html" "$APP/startpage/modern.html"
cp "$ROOT/assets/startpage/classic.html" "$APP/startpage/classic.html"
cp "$ROOT/assets/startpage/app.js" "$APP/startpage/app.js"
cp "$ROOT/assets/startpage/index.html" "$APP/extensions/aether-controls/home.html"
cp "$ROOT/assets/startpage/app.js" "$APP/extensions/aether-controls/app.js"
cp "$ROOT/assets/startpage/index.html" "$APP/extensions/aether-spotlight/home.html"
cp "$ROOT/assets/startpage/app.js" "$APP/extensions/aether-spotlight/app.js"

cp "$ROOT/config/preferences.json" "$APP/profile-template/Default/Preferences"
: > "$APP/profile-template/Default/Web Data"
$PYTHON scripts/install-search-engines.py "$APP/profile-template/Default/Web Data"

cp "$ROOT/scripts/aether-launcher.ps1" "$APP/Aether.ps1"
cp "$ROOT/scripts/aether-launcher.vbs" "$APP/Aether.vbs"
$PYTHON scripts/make-windows-icon.py "$APP/aether.ico"
printf '%s\n' "$VERSION" > "$APP/VERSION.txt"

echo "==> [7/8] Creating portable ZIP"
ZIP_OUT="$DIST/Aether-Windows-x86_64.zip"
rm -f "$ZIP_OUT"
(cd "$APP" && 7z a -tzip -mx=9 "$ZIP_OUT" . >/dev/null)

echo "==> [8/8] Creating NSIS installer"
EXE_OUT="$DIST/Aether-Windows-x86_64-setup.exe"
rm -f "$EXE_OUT"
APPROOT_WIN="$(win_path "$APP")"
OUTFILE_WIN="$(win_path "$EXE_OUT")"
SCRIPT_WIN="$(win_path "$ROOT/scripts/aether-installer.nsi")"
NSIS_ARGS=("/DAPPROOT=$APPROOT_WIN" "/DOUTFILE=$OUTFILE_WIN")
if command -v makensis >/dev/null 2>&1; then
  makensis "${NSIS_ARGS[@]}" "$ROOT/scripts/aether-installer.nsi"
elif [[ -n "${NSIS_DIR:-}" && -f "$NSIS_DIR/makensis.exe" ]]; then
  "$NSIS_DIR/makensis.exe" "${NSIS_ARGS[@]}" "$SCRIPT_WIN"
elif [[ -f "/c/Program Files (x86)/NSIS/makensis.exe" ]]; then
  "/c/Program Files (x86)/NSIS/makensis.exe" "${NSIS_ARGS[@]}" "$SCRIPT_WIN"
elif [[ -f "/c/Program Files/NSIS/makensis.exe" ]]; then
  "/c/Program Files/NSIS/makensis.exe" "${NSIS_ARGS[@]}" "$SCRIPT_WIN"
elif command -v wine >/dev/null 2>&1 && [[ -n "${NSIS_DIR:-}" ]]; then
  wine "$NSIS_DIR/makensis.exe" "${NSIS_ARGS[@]}" "$SCRIPT_WIN"
else
  echo "makensis not found; set NSIS_DIR to a portable NSIS directory" >&2
  exit 1
fi

echo "==> Done"
ls -lh "$ZIP_OUT" "$EXE_OUT"
