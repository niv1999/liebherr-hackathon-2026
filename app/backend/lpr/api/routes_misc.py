"""Dashboard, notifications, settings and the AI shopper simulator."""
from collections import defaultdict
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from .. import jobs, settings
from ..checks.ai import simulate_shopper
from ..db import get_session
from ..extract import extract
from ..llm import get_provider
from ..models import AppSetting, AuditRun, Criterion, Notification, PageSnapshot, Retailer, Verdict
from ..services import latest_runs, run_summary
from .schemas import AuditDefaultsIn, ScheduleIn, SimulateIn

router = APIRouter(tags=["dashboard"])


@router.get("/api/dashboard/overview")
def dashboard(s: Session = Depends(get_session)):
    rows, scores, airs = [], [], []
    passed = checked = needs_human = 0
    for r in s.exec(select(Retailer).where(Retailer.active == True).order_by(Retailer.name)).all():  # noqa: E712
        runs = latest_runs(s, r.id, 2)
        last = runs[0] if runs else None
        running = s.exec(select(AuditRun).where(AuditRun.retailer_id == r.id,
                                                AuditRun.status.in_(["queued", "running"]))).first()
        rows.append({"retailer": {"id": r.id, "name": r.name, "base_url": r.base_url, "access_note": r.access_note},
                     "latest_run": run_summary(last, runs[1] if len(runs) > 1 else None),
                     "running": run_summary(running) if running else None})
        if last and not last.blocked:
            if last.lpr_score is not None:
                scores.append(last.lpr_score)
            if last.ai_readiness_score is not None:
                airs.append(last.ai_readiness_score)
            for v in s.exec(select(Verdict).where(Verdict.run_id == last.id)).all():
                st = v.effective_status
                passed += st == "pass"
                checked += st in ("pass", "fail")
                needs_human += st == "needs_human"
    rows.sort(key=lambda x: -((x["latest_run"] or {}).get("lpr_score") or -1))
    return {
        "kpis": {"average_lpr_score": round(sum(scores) / len(scores), 1) if scores else None,
                 "criteria_passed": passed, "criteria_checked": checked, "needs_human": needs_human,
                 "average_ai_readiness": round(sum(airs) / len(airs), 1) if airs else None,
                 "retailers": len(rows)},
        "retailers": rows,
    }


@router.get("/api/dashboard/compare")
def compare(s: Session = Depends(get_session)):
    """Criterion x retailer matrix (pass rate of the latest audit) for the comparison view."""
    crit = {c.id: c for c in s.exec(select(Criterion).where(Criterion.active == True)).all()}  # noqa: E712
    retailers, matrix = [], defaultdict(dict)
    for r in s.exec(select(Retailer).where(Retailer.active == True)).all():  # noqa: E712
        runs = latest_runs(s, r.id, 1)
        if not runs or runs[0].blocked:
            continue
        retailers.append({"id": r.id, "name": r.name, "run_id": runs[0].id})
        agg = defaultdict(lambda: [0, 0])
        for v in s.exec(select(Verdict).where(Verdict.run_id == runs[0].id)).all():
            st = v.effective_status
            if st in ("pass", "fail"):
                agg[v.criterion_id][1] += 1
                agg[v.criterion_id][0] += st == "pass"
        for cid, (p, n) in agg.items():
            matrix[cid][r.name] = round(100 * p / n) if n else None
    return {"retailers": retailers,
            "rows": [{"code": c.code, "title": c.title, "block": c.block, "values": matrix.get(cid, {})}
                     for cid, c in sorted(crit.items(), key=lambda x: x[1].code)]}


# ------------------------------------------------------------------ notifications
@router.get("/api/notifications")
def notifications(unread_only: bool = False, limit: int = 30, s: Session = Depends(get_session)):
    q = select(Notification).order_by(Notification.id.desc()).limit(limit)
    if unread_only:
        q = q.where(Notification.read == False)  # noqa: E712
    return s.exec(q).all()


@router.post("/api/notifications/{nid}/read")
def mark_read(nid: int, s: Session = Depends(get_session)):
    n = s.get(Notification, nid)
    if not n:
        raise HTTPException(404, "Not found")
    n.read = True
    s.add(n)
    s.commit()
    return n


@router.post("/api/notifications/read-all")
def mark_all_read(s: Session = Depends(get_session)):
    for n in s.exec(select(Notification).where(Notification.read == False)).all():  # noqa: E712
        n.read = True
        s.add(n)
    s.commit()
    return {"ok": True}


# ------------------------------------------------------------------ settings
@router.get("/api/settings/schedule")
def get_schedule():
    return jobs.apply_schedule()


@router.put("/api/settings/schedule")
def set_schedule(body: ScheduleIn, s: Session = Depends(get_session)):
    row = s.get(AppSetting, "schedule") or AppSetting(key="schedule")
    row.value = body.model_dump()
    s.add(row)
    s.commit()
    return jobs.apply_schedule()


@router.get("/api/settings/audit-defaults")
def get_defaults(s: Session = Depends(get_session)):
    return (s.get(AppSetting, "audit_defaults") or AppSetting(key="audit_defaults", value={})).value


@router.put("/api/settings/audit-defaults")
def set_defaults(body: AuditDefaultsIn, s: Session = Depends(get_session)):
    row = s.get(AppSetting, "audit_defaults") or AppSetting(key="audit_defaults")
    row.value = body.model_dump()
    s.add(row)
    s.commit()
    return row.value


# ------------------------------------------------------------------ AI
@router.get("/api/ai/status")
def ai_status():
    p = get_provider()
    return {"provider": p.name, "available": p.available, "model": settings.GEMINI_MODEL if p.available else None}


@router.post("/api/ai/simulate")
def simulate(body: SimulateIn, s: Session = Depends(get_session)):
    """Live AI shopper simulator: answers a shopper question using only the retailer's audited pages."""
    retailer = s.get(Retailer, body.retailer_id)
    runs = latest_runs(s, body.retailer_id, 1)
    if not retailer or not runs:
        raise HTTPException(404, "No finished audit for this retailer yet")
    q = select(PageSnapshot).where(PageSnapshot.run_id == runs[0].id, PageSnapshot.blocked == False)  # noqa: E712
    if body.product_id:
        q = q.where(PageSnapshot.product_id == body.product_id)
    texts = []
    for p in s.exec(q).all():
        if p.html_path and Path(p.html_path).exists():
            e = extract(Path(p.html_path).read_text(encoding="utf-8"), p.url)
            texts.append(f"--- Page: {e.get('h1') or p.url}\n{e['text'][:12000]}")
    if not texts:
        raise HTTPException(404, "No readable pages in the latest audit")
    answer = simulate_shopper(body.question, "\n\n".join(texts), retailer.name)
    return {"retailer": retailer.name, "question": body.question, "answer": answer, "pages_used": len(texts)}
