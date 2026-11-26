#!/usr/bin/env python3
"""Build a multi-resolution Windows .ico from the Aether logo."""
import sys
from pathlib import Path
from PIL import Image

SIZES = (16, 32, 48, 64, 128, 256)


def find_logo(root: Path) -> Path:
    for candidate in (root / "site/assets/aether-256.png", root / "assets/aether-256.png"):
        if candidate.is_file():
            return candidate
    raise SystemExit("Aether logo not found")


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: make-windows-icon.py OUTPUT.ico")
    root = Path(__file__).resolve().parents[1]
    logo = Image.open(find_logo(root)).convert("RGBA")
    destination = Path(sys.argv[1])
    destination.parent.mkdir(parents=True, exist_ok=True)
    logo.save(destination, format="ICO", sizes=[(size, size) for size in SIZES])
    print(f"Wrote {destination}")


if __name__ == "__main__":
    main()
