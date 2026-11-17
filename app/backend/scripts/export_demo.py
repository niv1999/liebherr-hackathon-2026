"""Export the current audits as a demo snapshot for hosting (e.g. Hugging Face Spaces).

Creates app/demo/ with:
  lpr.db        copy of the database, cleaned: no AI connections / API keys, no demo notifications,
                file paths rewritten to the server's runtime folder (default /data)
  artifacts/    screenshots + product/brand page HTML of the audits (no search pages, no tiles)
  logos/        cached retailer logos
On start, the server copies this snapshot into an empty runtime folder (see lpr/api/__init__.py).

Usage (repo root):  app/.venv/Scripts/python.exe -X utf8 app/backend/scripts/export_demo.py [--target /data]
"""
from __future__ import annotations

import argparse
import shutil
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from lpr import settings  # noqa: E402

DEMO = settings.APP_DIR / "demo"
KEEP = ("pdp_", "brand_page", "brand_technology")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", default="/data", help="runtime folder on the server")
    target = ap.parse_args().target.rstrip("/")

    if DEMO.exists():
        shutil.rmtree(DEMO)
    (DEMO / "artifacts").mkdir(parents=True)

    # screenshots + page HTML that the app reads back (re-judge, AI shopper test)
    n = size = 0
    for run_dir in sorted(settings.ARTIFACTS_DIR.glob("run_*")):
        for f in run_dir.iterdir():
            if "_tile" in f.stem:
                continue
            if f.suffix == ".jpg" or (f.suffix == ".html" and f.name.startswith(KEEP)):
                dest = DEMO / "artifacts" / run_dir.name / f.name
                dest.parent.mkdir(exist_ok=True)
                shutil.copy2(f, dest)
                n += 1
                size += f.stat().st_size
    if (settings.RUNTIME_DIR / "logos").exists():
        shutil.copytree(settings.RUNTIME_DIR / "logos", DEMO / "logos")

    # database copy, cleaned
    db = DEMO / "lpr.db"
    src = sqlite3.connect(settings.DB_URL.replace("sqlite:///", ""))
    dst = sqlite3.connect(db)
    src.backup(dst)
    src.close()
    cur = dst.cursor()
    cur.execute("DELETE FROM aiconnection")
    cur.execute("DELETE FROM appsetting WHERE key = 'ai_active'")
    cur.execute("INSERT OR REPLACE INTO appsetting (key, value) VALUES ('ai_env_migrated', '{\"done\": true}')")
    cur.execute("UPDATE appsetting SET value = '{\"enabled\": false, \"interval_days\": 7}' WHERE key = 'schedule'")  # no auto-crawling from the demo host
    cur.execute("DELETE FROM notification WHERE title LIKE '%(demo)%'")
    cur.execute("UPDATE notification SET read = 1")
    old = str(settings.ARTIFACTS_DIR.resolve())
    cols = {"pagesnapshot": ["html_path", "raw_html_path", "screenshot_path", "fullpage_path"], "verdict": ["screenshot_path"]}
    for table, columns in cols.items():
        for c in columns:
            cur.execute(f"UPDATE {table} SET {c} = REPLACE(REPLACE({c}, ?, ?), '\\', '/') WHERE {c} IS NOT NULL",
                        (old, f"{target}/artifacts"))
    dst.commit()
    cur.execute("VACUUM")
    dst.close()
    print(f"demo snapshot: {n} files ({size / 1e6:.1f} MB) + database → {DEMO}")


if __name__ == "__main__":
    main()
