#!/usr/bin/env python3
"""Generate Aether's icons as real PNG files without any external deps."""
from pathlib import Path
import math
import struct
import zlib

ROOT = Path(__file__).resolve().parent.parent


def write_png(path, size, pixels):
    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter: none
        for x in range(size):
            raw.extend(pixels[y * size + x])
    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data +
                struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))
    png = (b"\x89PNG\r\n\x1a\n" +
           chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)) +
           chunk(b"IDAT", zlib.compress(bytes(raw), 9)) +
           chunk(b"IEND", b""))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)


def dist_to_segment(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def make_icon(size):
    pixels = []
    radius = 0.22
    thickness = 0.052
    strokes = [
        (0.22, 0.84, 0.50, 0.16),  # left leg
        (0.50, 0.16, 0.78, 0.84),  # right leg
        (0.30, 0.60, 0.70, 0.60),  # crossbar
    ]
    for y in range(size):
        v = (y + 0.5) / size
        for x in range(size):
            u = (x + 0.5) / size
            # rounded-square alpha
            cx = min(max(u, radius), 1 - radius)
            cy = min(max(v, radius), 1 - radius)
            inside = math.hypot(u - cx, v - cy) <= radius
            if not inside:
                pixels.append((0, 0, 0, 0))
                continue
            t = min(1.0, max(0.0, (u * 0.45 + v * 0.55)))
            r = int(108 + (34 - 108) * t)
            g = int(94 + (211 - 94) * t)
            b = int(248 + (238 - 248) * t)
            glyph = any(dist_to_segment(u, v, *s) < thickness for s in strokes)
            if glyph:
                r, g, b = 248, 250, 255
            pixels.append((r, g, b, 255))
    return pixels


if __name__ == "__main__":
    icon_dir = ROOT / "assets" / "icons"
    for s in (16, 32, 48, 64, 128, 256):
        write_png(icon_dir / f"aether-{s}.png", s, make_icon(s))
        print(f"wrote {icon_dir / f'aether-{s}.png'}")

    for ext in ("aether-block", "aether-tabs", "aether-controls", "aether-canvas", "aether-spotlight"):
        target = ROOT / "extensions" / ext / "icon.png"
        write_png(target, 48, make_icon(48))
        print(f"wrote {target}")
