#!/usr/bin/env bash
# Split a compressed universal Aether APK into smaller per-ABI APKs.
# Usage: build-android-splits.sh UNIVERSAL_APK TOOLS_DIR OUT_DIR
set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "usage: $0 UNIVERSAL_APK TOOLS_DIR OUT_DIR" >&2
  exit 2
fi

UNIVERSAL="$1"
TOOLS="$2"
OUT_DIR="$3"
WORK="$(mktemp -d /tmp/opencode/aether-android-splits.XXXXXX)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$OUT_DIR"

build_split() {
  local abi="$1" name="$2"
  local apk="$WORK/$name"
  cp "$UNIVERSAL" "$apk"

  local remove=()
  for other in armeabi-v7a arm64-v8a x86_64; do
    [[ "$other" == "$abi" ]] || remove+=("lib/$other/*")
  done
  zip -q -d "$apk" "${remove[@]}"

  "$TOOLS/zipalign" -f 4 "$apk" "$WORK/aligned.apk" >/dev/null

  keytool -genkeypair \
    -keystore "$WORK/$name.keystore" \
    -storepass android -keypass android \
    -alias aether -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=Aether Mobile, OU=Aether, O=Aether, L=Unknown, ST=Unknown, C=US" >/dev/null 2>&1
  "$TOOLS/apksigner" sign \
    --ks "$WORK/$name.keystore" --ks-pass pass:android --key-pass pass:android \
    --out "$OUT_DIR/$name" "$WORK/aligned.apk"

  echo "=== $name ==="
  "$TOOLS/apksigner" verify "$OUT_DIR/$name"
  unzip -l "$OUT_DIR/$name" | grep -oE 'lib/[^/]+/' | sort | uniq -c
  ls -lh "$OUT_DIR/$name"
}

build_split armeabi-v7a Aether-Android-armeabi-v7a.apk
build_split arm64-v8a Aether-Android-arm64.apk
build_split x86_64 Aether-Android-x86_64.apk
