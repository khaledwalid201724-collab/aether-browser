#!/usr/bin/env python3
"""Flip android:extractNativeLibs from false to true in a binary AndroidManifest.xml.

With extraction enabled, lib/*.so can be DEFLATE-compressed in the APK, which
makes a universal Chromium APK dramatically smaller.
"""
import struct
import sys
from pathlib import Path

STRING_POOL_TYPE = 0x0001
RES_XML_START_ELEMENT_TYPE = 0x0102
RES_XML_RESOURCE_MAP_TYPE = 0x0180
TYPE_INT_BOOLEAN = 0x12
ATTR_NAME = "extractNativeLibs"


def read_length8(data: bytearray, pos: int) -> tuple[int, int]:
    first = data[pos]
    pos += 1
    if first & 0x80:
        first = ((first & 0x7F) << 8) | data[pos]
        pos += 1
    return first, pos


def decode_string_pool(data: bytearray, offset: int, chunk_size: int) -> dict[str, int]:
    header_size = struct.unpack_from("<H", data, offset + 2)[0]
    string_count, _style_count, flags, strings_start = struct.unpack_from(
        "<IIII", data, offset + 8
    )
    utf8 = bool(flags & 0x100)
    result: dict[str, int] = {}
    for index in range(string_count):
        rel = struct.unpack_from("<I", data, offset + header_size + 4 * index)[0]
        pos = offset + strings_start + rel
        if utf8:
            _char_len, pos = read_length8(data, pos)
            byte_len, pos = read_length8(data, pos)
            value = bytes(data[pos : pos + byte_len]).decode("utf-8", errors="replace")
        else:
            length = struct.unpack_from("<H", data, pos)[0]
            pos += 2
            if length & 0x8000:
                length = ((length & 0x7FFF) << 16) | struct.unpack_from("<H", data, pos)[0]
                pos += 2
            value = bytes(data[pos : pos + 2 * length]).decode("utf-16-le", errors="replace")
        result.setdefault(value, index)
    return result


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: patch-android-extract-libs.py AndroidManifest.xml")
    path = Path(sys.argv[1])
    data = bytearray(path.read_bytes())

    if struct.unpack_from("<HHI", data, 0)[0] != 0x0003:
        raise SystemExit("not a binary AndroidManifest.xml")

    attr_index = None
    patched = 0
    offset = struct.unpack_from("<H", data, 2)[0]
    total = struct.unpack_from("<I", data, 4)[0]

    while offset + 8 <= total and offset < len(data):
        chunk_type, header_size, chunk_size = struct.unpack_from("<HHI", data, offset)
        if chunk_size < 8 or offset + chunk_size > len(data):
            raise SystemExit("invalid chunk size")

        if chunk_type == STRING_POOL_TYPE:
            strings = decode_string_pool(data, offset, chunk_size)
            attr_index = strings.get(ATTR_NAME)

        elif chunk_type == RES_XML_START_ELEMENT_TYPE and attr_index is not None:
            attr_ext = offset + header_size
            _ns, _name, attribute_start, attribute_size, attribute_count = struct.unpack_from(
                "<IIHHH", data, attr_ext
            )
            attr_base = attr_ext + attribute_start
            for i in range(attribute_count):
                attr = attr_base + i * attribute_size
                _attr_ns, attr_name, _raw = struct.unpack_from("<III", data, attr)
                if attr_name != attr_index:
                    continue
                value_size, _res0, value_type = struct.unpack_from("<HBB", data, attr + 12)
                if value_size != 8 or value_type != TYPE_INT_BOOLEAN:
                    raise SystemExit("unexpected extractNativeLibs value type")
                struct.pack_into("<I", data, attr + 16, 0xFFFFFFFF)
                patched += 1

        offset += chunk_size

    if attr_index is None:
        raise SystemExit(f"{ATTR_NAME} not found in string pool")
    if patched != 1:
        raise SystemExit(f"expected one extractNativeLibs attribute, patched {patched}")
    path.write_bytes(data)
    print(f"Set extractNativeLibs=true in {path}")


if __name__ == "__main__":
    main()
