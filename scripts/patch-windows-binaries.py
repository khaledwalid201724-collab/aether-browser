#!/usr/bin/env python3
"""Replace Chromium strings inside Windows PE binaries with Aether.

The replacement is length-preserving so no PE resource offsets change. Version
strings are set properly by rcedit afterwards; this catches other embedded
UTF-16 and ASCII strings that rcedit does not expose.
"""
import sys
from pathlib import Path

OLD_UTF16 = "Chromium".encode("utf-16-le")
NEW_UTF16 = "Aether".encode("utf-16-le") + b"\x00\x00"
OLD_ASCII = b"Chromium"
NEW_ASCII = b"Aether  "


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("usage: patch-windows-binaries.py FILE [FILE ...]")

    for filename in sys.argv[1:]:
        path = Path(filename)
        data = path.read_bytes()
        utf16_count = data.count(OLD_UTF16)
        ascii_count = data.count(OLD_ASCII)
        if not utf16_count and not ascii_count:
            continue
        data = data.replace(OLD_UTF16, NEW_UTF16).replace(OLD_ASCII, NEW_ASCII)
        path.write_bytes(data)
        print(f"Patched {path.name}: utf16={utf16_count} ascii={ascii_count}")


if __name__ == "__main__":
    main()
