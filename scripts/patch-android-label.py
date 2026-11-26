#!/usr/bin/env python3
"""Patch the standalone 'Chromium' app-label string in resources.arsc to Aether.

Replacement entries keep the original byte length, so every resource offset
stays valid and the APK does not need to be rebuilt. Chromium snapshots have
used both one-byte UTF-8 encoded string lengths and two-byte lengths, so both
layouts are supported.
"""
import struct
import sys
from pathlib import Path

PATTERNS = (
    # UTF-8 string pool: two one-byte lengths, ASCII bytes, NUL terminator.
    (b"\x08\x08Chromium\x00", b"\x06\x06Aether\x00\x00\x00"),
    # Older snapshots: two 16-bit lengths, ASCII bytes, NUL terminator.
    (
        struct.pack("<HH", 8, 8) + b"Chromium\x00",
        struct.pack("<HH", 6, 6) + b"Aether\x00\x00\x00",
    ),
)


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: patch-android-label.py resources.arsc")
    path = Path(sys.argv[1])
    data = path.read_bytes()
    matches = [(old, new, data.count(old)) for old, new in PATTERNS if data.count(old)]
    if len(matches) != 1 or matches[0][2] != 1:
        found = ", ".join(f"{count} of {old.hex()}" for old, _, count in matches) or "none"
        raise SystemExit(f"expected one app-label entry, found {found}")
    old, new, _ = matches[0]
    path.write_bytes(data.replace(old, new))
    print(f"Patched app label in {path}")


if __name__ == "__main__":
    main()
