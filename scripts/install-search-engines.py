#!/usr/bin/env python3
"""Inject our search engines into a Chromium 'Web Data' SQLite database."""
from pathlib import Path
import json
import sqlite3
import sys
import time
import uuid

ROOT = Path(__file__).resolve().parent.parent

MINIMAL_SCHEMA = """
CREATE TABLE IF NOT EXISTS meta (key LONGVARCHAR PRIMARY KEY, value LONGVARCHAR NOT NULL);
CREATE TABLE IF NOT EXISTS keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  short_name LONGVARCHAR NOT NULL,
  keyword LONGVARCHAR NOT NULL,
  favicon_url LONGVARCHAR NOT NULL,
  url LONGVARCHAR NOT NULL,
  safe_for_autoreplace INTEGER NOT NULL,
  originating_url LONGVARCHAR,
  date_created INTEGER NOT NULL,
  usage_count INTEGER NOT NULL,
  input_encodings LONGVARCHAR,
  suggest_url LONGVARCHAR,
  prepopulate_id INTEGER NOT NULL,
  created_by_policy INTEGER NOT NULL,
  instant_url LONGVARCHAR,
  last_modified INTEGER NOT NULL,
  sync_guid LONGVARCHAR,
  alternate_urls LONGVARCHAR,
  image_url LONGVARCHAR,
  search_terms_replacement_key LONGVARCHAR,
  is_active INTEGER NOT NULL
);
"""

VALUES = {
    "short_name": None,
    "keyword": None,
    "favicon_url": "",
    "url": None,
    "safe_for_autoreplace": 0,
    "originating_url": "",
    "date_created": int((time.time() + 11644473600) * 1000000),
    "usage_count": 0,
    "input_encodings": "UTF-8",
    "suggest_url": "",
    "prepopulate_id": 0,
    "created_by_policy": 0,
    "instant_url": "",
    "last_modified": int((time.time() + 11644473600) * 1000000),
    "sync_guid": None,
    "alternate_urls": "",
    "image_url": "",
    "search_terms_replacement_key": "",
    "is_active": 1,
}


def main(path):
    engines = json.loads((ROOT / "config" / "search-engines.json").read_text())
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(p))
    con.executescript(MINIMAL_SCHEMA)
    con.commit()

    columns = {row[1] for row in con.execute("PRAGMA table_info(keywords)")}
    for engine in engines:
        row = dict(VALUES)
        row.update(engine)
        row["sync_guid"] = str(uuid.uuid4())
        usable = {k: v for k, v in row.items() if k in columns and k != "id"}
        keys = list(usable)
        placeholders = ",".join("?" for _ in keys)
        con.execute(
            f"INSERT INTO keywords ({','.join(keys)}) VALUES ({placeholders})",
            [usable[k] for k in keys],
        )
    con.commit()
    con.close()
    print(f"  - installed {len(engines)} search engines into {p.name}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("usage: install-search-engines.py <path-to-Web Data>")
    main(sys.argv[1])
