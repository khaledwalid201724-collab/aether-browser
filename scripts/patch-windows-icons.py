#!/usr/bin/env python3
"""Replace Chromium's embedded product logos with the Aether logo.

Windows snapshots embed the product icon as PNG blobs inside chrome.exe,
chrome.dll and the beginning of resources.pak. Each replacement is padded to
the exact original byte length so no binary offsets change; PNG decoders ignore
trailing bytes after IEND.
"""
import io
import struct
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets/icons/aether-256.png"
PNG_SIG = b"\x89PNG\r\n\x1a\n"
IEND = b"IEND\xaeB`\x82"
LOGO_SIZES = {16, 24, 32, 48, 64, 128, 256}


def find_logos(data: bytes, max_offset: int | None = None):
    limit = len(data) if max_offset is None else min(max_offset, len(data))
    found = []
    pos = 0
    while True:
        pos = data.find(PNG_SIG, pos, limit)
        if pos < 0:
            break
        if pos + 24 <= len(data) and data[pos + 12:pos + 16] == b"IHDR":
            width, height = struct.unpack_from(">II", data, pos + 16)
            if width == height and width in LOGO_SIZES:
                end = data.find(IEND, pos)
                if end >= 0:
                    blob = data[pos:end + 8]
                    try:
                        mode = Image.open(io.BytesIO(blob)).mode
                    except Exception:
                        mode = "RGBA"
                    found.append((pos, len(blob), width, mode))
        pos += 8
    return found


def encode(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True, compress_level=9)
    return buf.getvalue()


def candidates(img: Image.Image, mode: str):
    if mode in {"RGBA", "RGB"}:
        for colors in (None, 256, 128, 64, 32, 16, 8, 4, 2):
            out = img if colors is None else img.quantize(
                colors=colors, method=Image.Quantize.FASTOCTREE
            )
            yield out.convert("RGBA" if mode == "RGBA" else "RGB")
    if mode == "P":
        for colors in (256, 128, 64, 32, 16, 8, 4, 2):
            yield img.convert("RGB").quantize(
                colors=colors, method=Image.Quantize.FASTOCTREE
            )
    if mode == "LA":
        alpha = img.getchannel("A")
        for colors in (None, 16, 4, 2):
            light = img.convert("L")
            if colors is not None:
                light = light.point(lambda v: (v // (256 // colors)) * (255 // max(colors - 1, 1)))
            yield Image.merge("LA", (light, alpha))
        black = Image.new("L", img.size, 0)
        yield Image.merge("LA", (black, alpha))


def make_png(size: int, target_length: int, mode: str) -> bytes:
    img = Image.open(SOURCE).convert("RGBA").resize((size, size), Image.LANCZOS)
    for candidate in candidates(img, mode):
        data = encode(candidate)
        if len(data) <= target_length:
            return data + b"\x00" * (target_length - len(data))
    raise RuntimeError(
        f"cannot fit {size}x{size} {mode} icon into {target_length} bytes"
    )


def patch(path: Path, max_offset: int | None = None) -> int:
    if not path.is_file():
        return 0
    data = bytearray(path.read_bytes())
    logos = find_logos(bytes(data), max_offset)
    for offset, length, size, mode in logos:
        data[offset:offset + length] = make_png(size, length, mode)
    if logos:
        path.write_bytes(data)
    print(f"  patched {len(logos)} logos in {path.name}")
    return len(logos)


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: patch-windows-icons.py CHROME_WIN_DIR")
    chrome_dir = Path(sys.argv[1])

    total = 0
    total += patch(chrome_dir / "chrome.exe")
    total += patch(chrome_dir / "chrome.dll")
    # Product logos are grouped near the start of resources.pak. Later square
    # PNGs are ordinary UI artwork and must be left alone.
    total += patch(chrome_dir / "resources.pak", max_offset=500000)
    print(f"  patched {total} product logos")


if __name__ == "__main__":
    main()
