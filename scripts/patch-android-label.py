#!/usr/bin/env python3
"""Patch the standalone 'Chromium' app-label string in resources.arsc to Aether.

The replacement keeps the string-pool entry the same length, so all resource
offsets remain valid without rebuilding the APK.
"""
import struct
import sys
from pathlib import Path

OLD = struct.pack("<HH", 8, 8) + b"Chromium\x00"
NEW = struct.pack("<HH", 6, 6) + b"Aether\x00\x00\x00"


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: patch-android-label.py resources.arsc")
    path = Path(sys.argv[1])
    data = path.read_bytes()
    count = data.count(OLD)
    if count != 1:
        raise SystemExit(f"expected one app-label entry, found {count}")
    path.write_bytes(data.replace(OLD, NEW))
    print(f"Patched app label in {path}")


if __name__ == "__main__":
    main()
