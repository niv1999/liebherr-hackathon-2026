"""Run one audit synchronously from the command line (handy for testing and for preparing demo data).

Usage (from repo root):
    app/.venv/Scripts/python.exe -X utf8 app/backend/scripts/run_audit.py "EP:" [--listing] [--codes PDP-01,PDP-04]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlmodel import select  # noqa: E402

from lpr.audit import run_audit  # noqa: E402
from lpr.db import init_db, session_scope  # noqa: E402
from lpr.models import AuditRun, Retailer  # noqa: E402
from lpr.seed import seed_all  # noqa: E402
from lpr.services import run_summary, run_verdicts  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("retailer")
    ap.add_argument("--listing", action="store_true", help="also count listed/available models (slow)")
    ap.add_argument("--codes", help="comma-separated criterion codes")
    a = ap.parse_args()
    init_db()
    with session_scope() as s:
        seed_all(s)
        r = s.exec(select(Retailer).where(Retailer.name == a.retailer)).first()
        if not r:
            sys.exit(f"Unknown retailer {a.retailer!r}")
        run = AuditRun(retailer_id=r.id, started_by="cli", include_listing=a.listing,
                       criterion_codes=a.codes.split(",") if a.codes else None)
        s.add(run)
        s.commit()
        run_id = run.id
    run_audit(run_id)
    with session_scope() as s:
        run = s.get(AuditRun, run_id)
        print(json.dumps(run_summary(run), default=str, indent=1))
        for v in run_verdicts(s, run_id):
            print(f"{v['product']['model'] if v['product'] else '-':16} {v['criterion']['code']:7} {v['status']:12} {v['reasoning'][:110]}")


if __name__ == "__main__":
    main()
