#!/usr/bin/env python3
"""Generate launch-time Chromium theme variants for Aether.

Each theme gets a colour palette plus a few very subtle bitmap textures used
for the tab strip, toolbar and omnibox. The textures are deliberately flat
gradients: they stay cheap to decode and give the browser chrome a soft,
modern depth without increasing memory use.
"""
from pathlib import Path
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "extensions" / "themes"

THEMES = {
    "aurora": ("Aether Aurora", dict(frame=[27,29,44], frame_inactive=[22,24,37], toolbar=[27,29,44],
        tab_background_text=[178,184,214], tab_text=[244,246,255], bookmark_text=[190,195,222],
        omnibox_background=[40,43,63], omnibox_text=[240,243,255], button_background_hover=[91,80,180],
        button_background_normal=[45,47,70], toolbar_button_icon=[190,195,222],
        tab_background_separator=[43,46,67], control_track=[43,46,67], control_thumb=[139,124,255]),
        [139,124,255]),
    "midnight": ("Aether Midnight", dict(frame=[13,18,34], frame_inactive=[10,14,27], toolbar=[13,18,34],
        tab_background_text=[150,170,210], tab_text=[235,242,255], bookmark_text=[170,185,220],
        omnibox_background=[24,32,54], omnibox_text=[235,242,255], button_background_hover=[40,66,120],
        button_background_normal=[24,32,54], toolbar_button_icon=[170,185,220],
        tab_background_separator=[30,40,64], control_track=[30,40,64], control_thumb=[96,165,250]),
        [96,165,250]),
    "emerald": ("Aether Emerald", dict(frame=[16,32,30], frame_inactive=[12,26,24], toolbar=[16,32,30],
        tab_background_text=[158,198,184], tab_text=[234,250,242], bookmark_text=[178,212,198],
        omnibox_background=[24,48,44], omnibox_text=[234,250,242], button_background_hover=[28,78,68],
        button_background_normal=[24,48,44], toolbar_button_icon=[178,212,198],
        tab_background_separator=[26,52,47], control_track=[26,52,47], control_thumb=[52,211,153]),
        [52,211,153]),
    "rose": ("Aether Rose", dict(frame=[38,22,32], frame_inactive=[30,18,26], toolbar=[38,22,32],
        tab_background_text=[206,168,190], tab_text=[255,237,246], bookmark_text=[220,182,204],
        omnibox_background=[58,32,48], omnibox_text=[255,237,246], button_background_hover=[112,48,78],
        button_background_normal=[58,32,48], toolbar_button_icon=[220,182,204],
        tab_background_separator=[58,32,48], control_track=[58,32,48], control_thumb=[251,113,133]),
        [251,113,133]),
    "graphite": ("Aether Graphite", dict(frame=[28,29,32], frame_inactive=[23,24,27], toolbar=[28,29,32],
        tab_background_text=[176,180,188], tab_text=[240,242,246], bookmark_text=[188,192,200],
        omnibox_background=[42,44,48], omnibox_text=[240,242,246], button_background_hover=[70,73,80],
        button_background_normal=[42,44,48], toolbar_button_icon=[188,192,200],
        tab_background_separator=[46,48,53], control_track=[46,48,53], control_thumb=[160,165,175]),
        [160,165,175]),
    "paper": ("Aether Paper", dict(frame=[238,240,247], frame_inactive=[226,229,239], toolbar=[238,240,247],
        tab_background_text=[78,84,110], tab_text=[28,32,52], bookmark_text=[70,76,100],
        omnibox_background=[255,255,255], omnibox_text=[28,32,52], button_background_hover=[214,218,235],
        button_background_normal=[248,249,253], toolbar_button_icon=[70,76,100],
        tab_background_separator=[210,214,228], control_track=[210,214,228], control_thumb=[109,94,248]),
        [109,94,248]),
}


def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient(size, base, accent, light=0.10, glow=0.10):
    """A vertical wash with a faint accent glow near the left edge."""
    w, h = size
    top = mix(base, (255, 255, 255), light)
    bottom = mix(base, accent, glow * 0.35)
    img = Image.new("RGB", size)
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(1, h - 1)
        row = mix(top, bottom, t)
        d.line([(0, y), (w, y)], fill=row)
    # Very soft horizontal accent bloom; barely visible but adds depth.
    for x in range(0, w, 4):
        a = glow * max(0, 1 - abs(x - w * 0.22) / (w * 0.5))
        if a <= 0.002:
            continue
        col = mix(img.getpixel((x, h // 2)), accent, a)
        d.line([(x, 0), (x + 3, h)], fill=col)
    return img


icon = (ROOT / "assets" / "icons" / "aether-48.png").read_bytes()
for name, (label, colors, accent) in THEMES.items():
    d = OUT / name
    d.mkdir(parents=True, exist_ok=True)
    (d / "icon.png").write_bytes(icon)

    frame = colors["frame"]
    # Toolbar / frame: a wide, shallow gradient.
    gradient((1280, 72), frame, accent, light=0.11, glow=0.13).save(d / "frame.png", optimize=True)
    gradient((1280, 72), colors["toolbar"], accent, light=0.06, glow=0.09).save(d / "toolbar.png", optimize=True)
    # Inactive tabs: slightly flatter texture.
    gradient((512, 44), colors["frame_inactive"], accent, light=0.07, glow=0.08).save(d / "tab.png", optimize=True)
    gradient((160, 34), colors["button_background_normal"], accent, light=0.10, glow=0.14).save(d / "button.png", optimize=True)

    manifest = {
        "manifest_version": 3,
        "name": label,
        "version": "1.0.0",
        "description": f"The {label} chrome theme for Aether.",
        "icons": {"48": "icon.png"},
        "theme": {
            "colors": colors,
            "images": {
                "theme_frame": "frame.png",
                "theme_toolbar": "toolbar.png",
                "theme_tab_background": "tab.png",
                "theme_button_background": "button.png",
            },
        },
    }
    (d / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print("wrote", d / "manifest.json")
