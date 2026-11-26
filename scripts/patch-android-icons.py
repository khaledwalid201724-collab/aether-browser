#!/usr/bin/env python3
"""Generate Aether WebP launcher icons for the branded Chromium Android APK.

Chromium's compiled resources use short, obfuscated file names. This script
writes replacement images to the exact resource paths referenced by
`aapt2 dump resources`, so zip can update the APK in place.
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
LOGO = ROOT / "site/assets/aether-256.png"

# resource path -> pixel size, taken from `aapt2 dump resources` on the
# upstream ChromePublic.apk.
LEGACY = {
    "res/80": 48,
    "res/k11": 72,
    "res/gS": 96,
    "res/R4": 144,
    "res/tT": 192,
}
ADAPTIVE_FOREGROUND = {
    "res/Qt": 108,
    "res/rp": 162,
    "res/PQ": 216,
    "res/EF": 324,
    "res/im": 432,
}
ADAPTIVE_BACKGROUND = {
    "res/lM": 108,
    "res/c5": 162,
    "res/6P": 216,
    "res/BL": 324,
    "res/PC": 432,
}
BACKGROUND_COLOR = (248, 250, 255, 255)


def save_webp(image: Image.Image, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, format="WEBP", lossless=True, quality=100, method=6)


def main() -> None:
    import sys

    if len(sys.argv) != 2:
        raise SystemExit("usage: patch-android-icons.py OUTPUT_DIR")
    out = Path(sys.argv[1])
    logo = Image.open(LOGO).convert("RGBA")

    for path, size in {**LEGACY, **ADAPTIVE_FOREGROUND}.items():
        save_webp(logo.resize((size, size), Image.LANCZOS), out / path)

    for path, size in ADAPTIVE_BACKGROUND.items():
        image = Image.new("RGBA", (size, size), BACKGROUND_COLOR)
        draw = ImageDraw.Draw(image)
        draw.ellipse(
            (size * 0.18, size * 0.18, size * 0.82, size * 0.82),
            fill=(236, 246, 255, 255),
        )
        save_webp(image, out / path)

    print(f"Wrote {len(LEGACY) + len(ADAPTIVE_FOREGROUND) + len(ADAPTIVE_BACKGROUND)} icons to {out}")


if __name__ == "__main__":
    main()
