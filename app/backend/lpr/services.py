"""Read-side helpers shared by the API and reports: summaries, overviews, to-do lists, re-scoring."""
from __future__ import annotations

from collections import defaultdict
from pathlib import Path

from sqlmodel import Session, select

from . import settings
from .models import AuditRun, Criterion, ListingCheck, Product, Retailer, Verdict
from .scoring import score, weight


def artifact_url(path: str | None) -> str | None:
    if not path:
        return None
    try:
        rel = Path(path).resolve().relative_to(settings.ARTIFACTS_DIR.resolve())
        return "/artifacts/" + rel.as_posix()
    except ValueError:
        return None


def status_label(run: AuditRun | None) -> str:
    if run is None:
        return "Not audited"
    if run.status in ("queued", "running"):
        return "Audit running"
    if run.status == "failed":
        return "Audit failed"
    if run.blocked:
        return "Blocked · manual assessment"
    if run.lpr_score is None:
        return "No data"
    if run.lpr_score >= 80:
        return "On track"
    if run.lpr_score >= 60:
        return "Gaps to fix"
    return "Action needed"


def latest_runs(s: Session, retailer_id: int, n: int = 2, done_only: bool = True) -> list[AuditRun]:
    q = select(AuditRun).where(AuditRun.retailer_id == retailer_id)
    if done_only:
        q = q.where(AuditRun.status == "done")
    return list(s.exec(q.order_by(AuditRun.id.desc()).limit(n)).all())


def run_summary(run: AuditRun | None, prev: AuditRun | None = None) -> dict | None:
    if run is None:
        return None
    change = None
    if prev and prev.lpr_score is not None and run.lpr_score is not None:
        change = round(run.lpr_score - prev.lpr_score, 1)
    return {
        "id": run.id, "status": run.status, "trigger": run.trigger, "started_by": run.started_by,
        "progress": run.progress, "created_at": run.created_at, "started_at": run.started_at,
        "finished_at": run.finished_at, "blocked": run.blocked, "lpr_score": run.lpr_score,
        "lpr_score_change": change, "ai_readiness_score": run.ai_readiness_score,
        "checked_count": run.checked_count, "applicable_count": run.applicable_count,
        "return_risk_count": run.return_risk_count, "reference_count": run.reference_count,
        "listed_count": run.listed_count, "available_count": run.available_count,
        "block_scores": run.block_scores, "error": run.error, "status_label": status_label(run),
    }


def verdict_dict(v: Verdict, c: Criterion | None, p: Product | None) -> dict:
    return {
        "id": v.id, "run_id": v.run_id, "status": v.effective_status, "original_status": v.status,
        "source": v.source, "confidence": v.confidence, "reasoning": v.reasoning, "evidence": v.evidence,
        "screenshot_url": artifact_url(v.screenshot_path), "overridden": v.override_status is not None,
        "override_by": v.override_by, "override_comment": v.override_comment, "override_at": v.override_at,
        "suggested_fix": v.suggested_fix, "due_date": v.due_date,
        "criterion": None if c is None else {
            "id": c.id, "code": c.code, "title": c.title, "block": c.block, "section": c.section,
            "method": c.method, "priority": c.priority, "return_risk": c.return_risk, "weight": weight(c)},
        "product": None if p is None else {"id": p.id, "model": p.model, "sk": p.sk},
    }


def run_verdicts(s: Session, run_id: int) -> list[dict]:
    crit = {c.id: c for c in s.exec(select(Criterion)).all()}
    prods = {p.id: p for p in s.exec(select(Product)).all()}
    vs = s.exec(select(Verdict).where(Verdict.run_id == run_id)).all()
    return [verdict_dict(v, crit.get(v.criterion_id), prods.get(v.product_id)) for v in vs]


def rescore(s: Session, run_id: int) -> AuditRun:
    run = s.get(AuditRun, run_id)
    verdicts = s.exec(select(Verdict).where(Verdict.run_id == run_id)).all()
    crit = {c.id: c for c in s.exec(select(Criterion)).all()}
    for k, v in score(verdicts, crit).items():
        setattr(run, k, v)
    s.add(run)
    s.commit()
    return run


def todo_list(s: Session, run_id: int) -> list[dict]:
    """Failed criteria for the retailer, grouped per criterion, sorted by weight (most important first)."""
    groups: dict[int, dict] = {}
    for v in run_verdicts(s, run_id):
        if v["status"] != "fail" or not v["criterion"]:
            continue
        c = v["criterion"]
        g = groups.setdefault(c["id"], {"criterion": c, "products": [], "suggested_fix": v["suggested_fix"],
                                        "due_date": v["due_date"], "evidence": [], "verdict_ids": []})
        g["products"].append(v["product"]["model"] if v["product"] else None)
        g["verdict_ids"].append(v["id"])
        g["evidence"].append({"product": v["product"]["model"] if v["product"] else None,
                              "reasoning": v["reasoning"], "screenshot_url": v["screenshot_url"]})
        if v["due_date"] and (not g["due_date"] or v["due_date"] < g["due_date"]):
            g["due_date"] = v["due_date"]
    return sorted(groups.values(), key=lambda g: (-g["criterion"]["weight"], g["criterion"]["code"]))


def retailer_overview(s: Session, retailer: Retailer) -> dict:
    runs = latest_runs(s, retailer.id, 2)
    run = runs[0] if runs else None
    out = {"retailer": retailer, "latest_run": run_summary(run, runs[1] if len(runs) > 1 else None),
           "good": [], "missing": [], "needs_human": [], "return_risks": [], "listing": None, "history": []}
    hist = s.exec(select(AuditRun).where(AuditRun.retailer_id == retailer.id, AuditRun.status == "done")
                  .order_by(AuditRun.id)).all()
    out["history"] = [{"run_id": r.id, "date": r.finished_at, "lpr_score": r.lpr_score,
                       "ai_readiness_score": r.ai_readiness_score} for r in hist]
    if not run:
        return out
    per_crit: dict[int, dict] = defaultdict(lambda: {"pass": 0, "fail": 0, "other": 0, "verdicts": []})
    for v in run_verdicts(s, run.id):
        if not v["criterion"]:
            continue
        g = per_crit[v["criterion"]["id"]]
        g["criterion"] = v["criterion"]
        st = v["status"]
        g["pass" if st == "pass" else "fail" if st == "fail" else "other"] += 1
        g["verdicts"].append({k: v[k] for k in ("id", "status", "reasoning", "screenshot_url", "product", "source")})
        if st == "fail" and v["criterion"]["return_risk"]:
            out["return_risks"].append({"criterion": v["criterion"]["title"], "code": v["criterion"]["code"],
                                        "product": v["product"]["model"] if v["product"] else None,
                                        "reasoning": v["reasoning"], "verdict_id": v["id"]})
    for g in per_crit.values():
        item = {"criterion": g["criterion"], "passed": g["pass"], "failed": g["fail"], "unchecked": g["other"],
                "verdicts": g["verdicts"]}
        if g["fail"]:
            out["missing"].append(item)
        elif g["pass"]:
            out["good"].append(item)
        else:
            out["needs_human"].append(item)
    for key in ("good", "missing", "needs_human"):
        out[key].sort(key=lambda i: (-i["criterion"]["weight"], i["criterion"]["code"]))
    checks = s.exec(select(ListingCheck).where(ListingCheck.run_id == run.id)).all()
    if checks:
        prods = {p.id: p for p in s.exec(select(Product)).all()}
        out["listing"] = {"reference_count": run.reference_count, "listed_count": run.listed_count,
                          "available_count": run.available_count,
                          "items": [{"model": prods[c.product_id].model, "sk": prods[c.product_id].sk,
                                     "listed": c.listed, "available": c.available, "url": c.url} for c in checks]}
    return out
