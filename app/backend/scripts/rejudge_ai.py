"""Re-run the two AI judges for one audit run on the saved pages (no new crawl). Rule verdicts stay as they are
and are given to the judges as tool facts.

Usage (from repo root):
    LPR_LLM_PROVIDER=file app/.venv/Scripts/python.exe -X utf8 app/backend/scripts/rejudge_ai.py <run_id> [--models "CBNbda 5223-22,..."]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlmodel import select  # noqa: E402

from lpr.audit import _feedback_examples  # noqa: E402
from lpr.checks import CheckContext  # noqa: E402
from lpr.db import init_db, session_scope  # noqa: E402
from lpr.extract import extract  # noqa: E402
from lpr.judges import judge_kind, run_judge  # noqa: E402
from lpr.models import AuditRun, Criterion, PageSnapshot, Product, Retailer, Verdict  # noqa: E402
from lpr.services import rescore, run_summary  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("run_id", type=int)
    ap.add_argument("--models")
    a = ap.parse_args()
    init_db()
    models = set(a.models.split(",")) if a.models else None
    with session_scope() as s:
        run = s.get(AuditRun, a.run_id)
        retailer = s.get(Retailer, run.retailer_id)
        crit = {c.id: c for c in s.exec(select(Criterion)).all()}
        for snap in s.exec(select(PageSnapshot).where(PageSnapshot.run_id == run.id)).all():
            product = s.get(Product, snap.product_id)
            if (models and product.model not in models) or not snap.html_path or snap.blocked:
                continue
            verdicts = s.exec(select(Verdict).where(Verdict.page_id == snap.id)).all()
            ai_v = {v.criterion_id: v for v in verdicts if crit[v.criterion_id].method == "ai"}
            facts = [f"{crit[v.criterion_id].code} {crit[v.criterion_id].title}: {v.status.upper()} ({v.reasoning})"
                     for v in verdicts if crit[v.criterion_id].method == "rule"]
            page = extract(Path(snap.html_path).read_text(encoding="utf-8"), snap.url)
            facts.append(f"Page content length: about {len(page['content_text'].split())} words (without navigation)")
            for kind in ("content", "vision"):
                group = [crit[cid] for cid in ai_v if judge_kind(crit[cid]) == kind]
                if not group:
                    continue
                ctx = CheckContext(retailer=retailer, criterion=group[0], product=product, page=page,
                                   screenshot_path=snap.screenshot_path)
                res = run_judge(kind, ctx, group, facts, {c.id: _feedback_examples(s, c.id) for c in group})
                for c in group:
                    v, r = ai_v[c.id], res[c.id]
                    v.status, v.reasoning, v.evidence, v.confidence, v.source = r.status, r.reasoning, r.evidence, r.confidence, "ai"
                    v.suggested_fix = c.fix_hint if r.status == "fail" else None
                    s.add(v)
                    print(f"{product.model:16} {kind:7} {c.code:7} {r.status:12} conf={r.confidence} {r.reasoning[:100]}")
            s.commit()
        sm = run_summary(rescore(s, run.id))
        print("LPR", sm["lpr_score"], "| AI-readiness", sm["ai_readiness_score"], "| checked", sm["checked_count"], "of", sm["applicable_count"])


if __name__ == "__main__":
    main()
