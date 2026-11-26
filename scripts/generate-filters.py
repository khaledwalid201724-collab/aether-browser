#!/usr/bin/env python3
"""Turn the compact filter sources into declarativeNetRequest rulesets.

Rule IDs are globally unique across every ruleset. The large ads group is
split into two smaller rulesets; other groups stay in a single file.
"""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "config" / "filters" / "sources.txt"
OUT = ROOT / "extensions" / "aether-block" / "rulesets"

RESOURCE_TYPES = [
    "script", "image", "stylesheet", "xmlhttprequest", "sub_frame",
    "ping", "media", "font", "object", "other",
]
BASES = {"ads": 1, "trackers": 1000, "social": 2000}


def parse():
    groups = {}
    current = None
    for raw in SOURCE.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or line.startswith("!"):
            continue
        if line.startswith("[") and line.endswith("]"):
            current = line[1:-1]
            groups.setdefault(current, [])
        elif current:
            groups[current].append(line)
    return groups


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for stale in OUT.glob("*.json"):
        stale.unlink()

    for name, filters in parse().items():
        base = BASES[name]
        chunks = [filters] if name != "ads" else [
            filters[:len(filters) // 2], filters[len(filters) // 2:]
        ]
        offset = 0
        for part, chunk in enumerate(chunks):
            suffix = "" if len(chunks) == 1 else "-" + "ab"[part]
            filename = f"{name}{suffix}.json"
            rules = [{
                "id": base + offset + i,
                "priority": 1,
                "action": {"type": "block"},
                "condition": {"urlFilter": filt, "resourceTypes": RESOURCE_TYPES},
            } for i, filt in enumerate(chunk, start=1)]
            (OUT / filename).write_text(json.dumps(rules, separators=(",", ":")))
            first = base + offset + 1
            print(f"wrote {filename}: {len(rules)} rules (ids {first}-{base + offset + len(rules)})")
            offset += len(chunk)


if __name__ == "__main__":
    main()
