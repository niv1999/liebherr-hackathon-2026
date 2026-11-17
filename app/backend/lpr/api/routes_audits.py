from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlmodel import Session, select

from .. import jobs
from ..checks import REGISTRY, CheckContext
from ..db import get_session
from ..extract import extract
from ..models import AuditRun, Criterion, Feedback, PageSnapshot, Product, Retailer, Verdict, now
from ..reports import excel_report, pdf_report
from ..services import rescore, run_summary, run_verdicts, todo_list
from .schemas import AuditIn, FeedbackIn, FixedIn, VerdictPatch

router = APIRouter(tags=["audits"])


def _run(s: Session, run_id: int) -> AuditRun:
    run = s.get(AuditRun, run_id)
    if not run:
        raise HTTPException(404, "Audit not found")
    return run


@router.post("/api/audits", status_code=202)
def start_audit(body: AuditIn):
    """Start audits now (one run per retailer, executed one after another in the background)."""
    ids = jobs.create_runs(body.retailer_ids, "manual", body.started_by, body.criterion_codes, body.product_ids,
                           body.include_listing)
    if not ids:
        raise HTTPException(400, "No active retailer matched")
    return {"run_ids": ids}


@router.get("/api/audits")
def list_audits(retailer_id: Optional[int] = None, limit: int = 50, s: Session = Depends(get_session)):
    q = select(AuditRun).order_by(AuditRun.id.desc()).limit(limit)
    if retailer_id:
        q = q.where(AuditRun.retailer_id == retailer_id)
    names = {r.id: r.name for r in s.exec(select(Retailer)).all()}
    return [{**run_summary(r), "retailer_id": r.retailer_id, "retailer": names.get(r.retailer_id)} for r in s.exec(q).all()]


@router.get("/api/audits/{run_id}")
def get_audit(run_id: int, s: Session = Depends(get_session)):
    run = _run(s, run_id)
    prev = s.exec(select(AuditRun).where(AuditRun.retailer_id == run.retailer_id, AuditRun.status == "done",
                                         AuditRun.id < run.id).order_by(AuditRun.id.desc())).first()
    pages = s.exec(select(PageSnapshot).where(PageSnapshot.run_id == run_id)).all()
    from ..services import artifact_url
    return {
        "run": {**run_summary(run, prev), "retailer_id": run.retailer_id,
                "retailer": s.get(Retailer, run.retailer_id).name},
        "pages": [{"id": p.id, "product_id": p.product_id, "url": p.url, "status_code": p.status_code,
                   "blocked": p.blocked, "screenshot_url": artifact_url(p.screenshot_path),
                   "fullpage_url": artifact_url(p.fullpage_path), "title": (p.extracted or {}).get("h1")} for p in pages],
        "verdicts": run_verdicts(s, run_id),
    }


@router.get("/api/audits/{run_id}/todo")
def audit_todo(run_id: int, s: Session = Depends(get_session)):
    _run(s, run_id)
    return todo_list(s, run_id)


@router.post("/api/audits/{run_id}/todo/{criterion_id}/fixed")
def mark_fixed(run_id: int, criterion_id: int, body: FixedIn, s: Session = Depends(get_session)):
    """The retailer fixed this item: all its failed verdicts in this audit become 'pass' (as an override)."""
    _run(s, run_id)
    vs = s.exec(select(Verdict).where(Verdict.run_id == run_id, Verdict.criterion_id == criterion_id)).all()
    changed = 0
    for v in vs:
        if v.effective_status == "fail":
            v.override_status, v.override_by, v.override_comment, v.override_at = "pass", body.by, "Marked as fixed", now()
            s.add(v)
            changed += 1
    s.commit()
    return {"changed": changed, "run": run_summary(rescore(s, run_id))}


@router.get("/api/audits/{run_id}/report.xlsx")
def audit_excel(run_id: int, s: Session = Depends(get_session)):
    run = _run(s, run_id)
    data = excel_report(s, run)
    name = f"LPR_audit_{s.get(Retailer, run.retailer_id).name}_{run.id}.xlsx".replace(":", "")
    return Response(data, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": f'attachment; filename="{name}"'})


@router.get("/api/audits/{run_id}/report.pdf")
def audit_pdf(run_id: int, s: Session = Depends(get_session)):
    run = _run(s, run_id)
    data = pdf_report(s, run)
    name = f"LPR_report_{s.get(Retailer, run.retailer_id).name}_{run.id}.pdf".replace(":", "")
    return Response(data, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{name}"'})


# ------------------------------------------------------------------ verdicts
@router.patch("/api/verdicts/{vid}")
def update_verdict(vid: int, body: VerdictPatch, s: Session = Depends(get_session)):
    """Manual override of a verdict (+ deadline / suggested fix for the retailer report)."""
    v = s.get(Verdict, vid)
    if not v:
        raise HTTPException(404, "Verdict not found")
    data = body.model_dump(exclude_unset=True)
    if data.pop("clear_override", False):
        v.override_status = v.override_by = v.override_comment = v.override_at = None
    if "override_status" in data:
        v.override_status = data.pop("override_status")
        v.override_at = now()
    for k, val in data.items():
        setattr(v, k, val)
    s.add(v)
    s.commit()
    run = rescore(s, v.run_id)
    c = s.get(Criterion, v.criterion_id)
    return {"verdict": next(x for x in run_verdicts(s, v.run_id) if x["id"] == vid), "run": run_summary(run),
            "criterion_code": c.code}


@router.post("/api/verdicts/{vid}/feedback", status_code=201)
def add_feedback(vid: int, body: FeedbackIn, s: Session = Depends(get_session)):
    """Feedback on an AI verdict. Used as an example in future prompts for this criterion.
    If corrected_status is given, the verdict is also overridden."""
    v = s.get(Verdict, vid)
    if not v:
        raise HTTPException(404, "Verdict not found")
    fb = Feedback(verdict_id=vid, criterion_id=v.criterion_id, author=body.author, comment=body.comment,
                  corrected_status=body.corrected_status)
    s.add(fb)
    if body.corrected_status:
        v.override_status, v.override_by, v.override_comment, v.override_at = (
            body.corrected_status, body.author, body.comment, now())
        s.add(v)
    s.commit()
    rescore(s, v.run_id)
    return fb


@router.get("/api/verdicts/{vid}/feedback")
def list_feedback(vid: int, s: Session = Depends(get_session)):
    return s.exec(select(Feedback).where(Feedback.verdict_id == vid).order_by(Feedback.id)).all()


@router.post("/api/verdicts/{vid}/rejudge")
def rejudge(vid: int, s: Session = Depends(get_session)):
    """Re-run one criterion on the already saved page (no new crawl). Uses the current prompt + feedback."""
    from ..audit import _feedback_examples
    from ..crawler import robots_txt

    v = s.get(Verdict, vid)
    if not v or not v.page_id:
        raise HTTPException(404, "Verdict or page not found")
    page = s.get(PageSnapshot, v.page_id)
    c = s.get(Criterion, v.criterion_id)
    fn = REGISTRY.get(c.rule_key or "")
    if not fn or not page.html_path or not Path(page.html_path).exists():
        raise HTTPException(400, "This criterion cannot be re-judged automatically")
    html = Path(page.html_path).read_text(encoding="utf-8")
    retailer = s.get(Retailer, s.get(AuditRun, v.run_id).retailer_id)
    ctx = CheckContext(retailer=retailer, criterion=c, product=s.get(Product, v.product_id), page=extract(html, page.url),
                       robots_txt=robots_txt(retailer.base_url) if c.rule_key == "air_robots" else None,
                       screenshot_path=page.screenshot_path, image_info=(page.extracted or {}).get("image_info", []),
                       feedback_examples=_feedback_examples(s, c.id))
    r = fn(ctx)
    v.status, v.reasoning, v.evidence, v.confidence, v.source = r.status, r.reasoning, r.evidence, r.confidence, r.source
    v.override_status = v.override_by = v.override_comment = v.override_at = None
    s.add(v)
    s.commit()
    rescore(s, v.run_id)
    return next(x for x in run_verdicts(s, v.run_id) if x["id"] == vid)
