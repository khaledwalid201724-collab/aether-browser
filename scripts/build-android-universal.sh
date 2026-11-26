#!/usr/bin/env bash
# Build a branded, universal Chromium-based Aether Android APK.
# Usage: build-android-universal.sh ARM_APK ARM64_APK X64_APK TOOLS_DIR OUT.apk
#   ARM_APK   ChromePublic.apk from snapshot prefix Android/
#   ARM64_APK ChromePublic.apk from snapshot prefix Android_Arm64/
#   X64_APK   ChromePublic.apk from snapshot prefix AndroidDesktop_x64/
#   TOOLS_DIR directory containing apksigner, zipalign and aapt2
set -euo pipefail

if [[ $# -ne 5 ]]; then
  echo "usage: $0 ARM_APK ARM64_APK X64_APK TOOLS_DIR OUT.apk" >&2
  exit 2
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARM_APK="$1"
ARM64_APK="$2"
X64_APK="$3"
TOOLS="$4"
OUT="$5"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/aether-android-build.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

mkdir -p "$WORK/arsc" "$WORK/manifest" "$WORK/icons" "$WORK/libs" "$WORK/final" "$(dirname "$OUT")"

cp "$ARM_APK" "$WORK/final/aether.apk"

echo "Patching app label..."
unzip -p "$ARM_APK" resources.arsc > "$WORK/arsc/resources.arsc"
python3 "$ROOT/scripts/patch-android-label.py" "$WORK/arsc/resources.arsc"
(cd "$WORK/arsc" && zip -q -0 "$WORK/final/aether.apk" resources.arsc)

echo "Enabling compressed native libraries..."
unzip -p "$ARM_APK" AndroidManifest.xml > "$WORK/manifest/AndroidManifest.xml"
python3 "$ROOT/scripts/patch-android-extract-libs.py" "$WORK/manifest/AndroidManifest.xml"
(cd "$WORK/manifest" && zip -q -0 "$WORK/final/aether.apk" AndroidManifest.xml)

echo "Replacing launcher icons..."
python3 "$ROOT/scripts/patch-android-icons.py" "$WORK/icons"
(
  cd "$WORK/icons"
  find . -type f | sed 's#^\./##' | sort | xargs zip -q -0 "$WORK/final/aether.apk"
)

merge_libs() {
  local src="$1" abi="$2"
  mkdir -p "$WORK/libs/$abi"
  unzip -q -o "$src" "lib/$abi/*" -d "$WORK/libs/$abi"
  (cd "$WORK/libs/$abi" && zip -q -9 "$WORK/final/aether.apk" "lib/$abi/"*)
}

echo "Merging native libraries..."
merge_libs "$ARM_APK" armeabi-v7a
merge_libs "$ARM64_APK" arm64-v8a
merge_libs "$X64_APK" x86_64

echo "Aligning and signing..."
"$TOOLS/zipalign" -f 4 "$WORK/final/aether.apk" "$WORK/aligned.apk" >/dev/null
keytool -genkeypair \
  -keystore "$WORK/aether.keystore" \
  -storepass android -keypass android \
  -alias aether -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=Aether Mobile, OU=Aether, O=Aether, L=Unknown, ST=Unknown, C=US" >/dev/null 2>&1
"$TOOLS/apksigner" sign \
  --ks "$WORK/aether.keystore" \
  --ks-pass pass:android --key-pass pass:android \
  --out "$OUT" "$WORK/aligned.apk"

echo "=== verification ==="
"$TOOLS/apksigner" verify --verbose "$OUT"
echo "=== badging ==="
"$TOOLS/aapt2" dump badging "$OUT" 2>/dev/null | grep -E 'package:|application-label:|application-icon' | head -5
echo "=== ABIs ==="
unzip -l "$OUT" | grep -oE 'lib/[^/]+/' | sort | uniq -c
sha256sum "$OUT"
