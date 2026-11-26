#!/usr/bin/env python3
"""Rebrand Chromium UI strings inside Windows .pak resource files.

Chromium stores almost all browser UI text in data-pack files. This script
reads versions 4 and 5 of that format, rewrites the strings, and emits a valid
replacement pack with recomputed offsets and aliases.
"""
import struct
import sys
from pathlib import Path

ENTRY = struct.Struct("<HI")
HEADER_V5_OUT = struct.Struct("<IB3xHH")
HEADER_V5_IN = struct.Struct("<B3xHH")
HEADER_V4_IN = struct.Struct("<IB")

# Keep ChromeOS (the operating system name) untouched.
PROTECT = {"ChromeOS": b"\xff\xfeCHROMEOS\xff\xfe"}
REPLACEMENTS = [
    (b"Google Chrome", b"Aether"),
    (b"Chrome Web Store", b"Aether Store"),
    (b"AI in Chrome", b"AI in Aether"),
    (b"Chromium", b"Aether"),
    (b"Chrome", b"Aether"),
]


def rebrand(payload: bytes) -> tuple[bytes, int]:
    for original, token in PROTECT.items():
        payload = payload.replace(original.encode(), token)
    changed = 0
    for old, new in REPLACEMENTS:
        changed += payload.count(old)
        payload = payload.replace(old, new)
    for original, token in PROTECT.items():
        payload = payload.replace(token, original.encode())
    return payload, changed


def read_pack(data: bytes) -> tuple[int, dict[int, bytes]]:
    version = struct.unpack_from("<I", data, 0)[0]
    if version == 5:
        encoding, count, alias_count = HEADER_V5_IN.unpack_from(data, 4)
        header_size = 12
    elif version == 4:
        count, encoding = HEADER_V4_IN.unpack_from(data, 4)
        alias_count = 0
        header_size = 9
    else:
        raise SystemExit(f"unsupported pak version {version}")

    entries = []
    for i in range(count + 1):
        resource_id, offset = ENTRY.unpack_from(data, header_size + i * ENTRY.size)
        entries.append((resource_id, offset))

    resources: dict[int, bytes] = {}
    for i in range(count):
        resource_id, start = entries[i]
        end = entries[i + 1][1]
        resources[resource_id] = data[start:end]

    alias_base = header_size + (count + 1) * ENTRY.size
    for i in range(alias_count):
        alias_id, index = struct.unpack_from("<HH", data, alias_base + i * 4)
        if index >= count:
            raise SystemExit(f"alias {alias_id} points past resource table")
        resources[alias_id] = resources[entries[index][0]]

    return encoding, resources


def write_pack(encoding: int, resources: dict[int, bytes]) -> bytes:
    ids = sorted(resources)
    id_by_data: dict[bytes, int] = {}
    for resource_id in reversed(ids):
        id_by_data[resources[resource_id]] = resource_id

    aliases = {
        resource_id: id_by_data[resources[resource_id]]
        for resource_id in ids
        if id_by_data[resources[resource_id]] != resource_id
    }
    main_ids = [resource_id for resource_id in ids if resource_id not in aliases]

    count = len(main_ids)
    alias_count = len(aliases)
    data_offset = HEADER_V5_OUT.size + (count + 1) * ENTRY.size + alias_count * 4

    out = bytearray(HEADER_V5_OUT.pack(5, encoding, count, alias_count))
    index_by_id: dict[int, int] = {}
    payloads = []
    for index, resource_id in enumerate(main_ids):
        index_by_id[resource_id] = index
        out.extend(ENTRY.pack(resource_id, data_offset))
        payload = resources[resource_id]
        data_offset += len(payload)
        payloads.append(payload)
    out.extend(ENTRY.pack(0, data_offset))

    for resource_id in sorted(aliases):
        out.extend(struct.pack("<HH", resource_id, index_by_id[aliases[resource_id]]))

    for payload in payloads:
        out.extend(payload)
    return bytes(out)


def main() -> None:
    args = sys.argv[1:]
    in_place = False
    if args and args[0] == "--in-place":
        in_place = True
        args = args[1:]
    if not args:
        raise SystemExit(
            "usage: patch-windows-paks.py [--in-place] OUTPUT_DIR PAK [PAK ...]"
        )

    if in_place:
        out_dir = None
        paths = [Path(arg) for arg in args]
    else:
        out_dir = Path(args[0])
        out_dir.mkdir(parents=True, exist_ok=True)
        paths = [Path(arg) for arg in args[1:]]

    total = 0
    patched_files = 0
    for path in paths:
        encoding, resources = read_pack(path.read_bytes())
        changed = 0
        for resource_id, payload in resources.items():
            resources[resource_id], n = rebrand(payload)
            changed += n
        destination = path if in_place else out_dir / path.name
        destination.write_bytes(write_pack(encoding, resources))
        if changed:
            patched_files += 1
            print(f"Rewrote {path.name}: {changed} strings")
        total += changed

    print(f"Replaced {total} strings in {patched_files} files")


if __name__ == "__main__":
    main()
