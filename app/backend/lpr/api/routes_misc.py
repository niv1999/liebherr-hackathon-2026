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
from ..models import AIConnection, AppSetting, AuditRun, Criterion, Notification, PageSnapshot, Retailer, Verdict
from ..services import latest_runs, run_summary
from .schemas import AIConnectionIn, AIConnectionPatch, AuditDefaultsIn, ScheduleIn, SimulateIn

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
    out = []
    for n in s.exec(q).all():
        run = s.get(AuditRun, n.run_id) if n.run_id else None
        out.append({**n.model_dump(), "retailer_id": run.retailer_id if run else None})
    return out


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
    return {"available": p.available, "provider": p.name, "model": getattr(p, "model", None),
            "connection": getattr(p, "connection_name", None)}


MODEL_NAMES = {"gemini-2.5-flash": "Gemini 2.5 Flash", "gemini-2.5-pro": "Gemini 2.5 Pro",
               "claude-opus-5-5": "Claude Opus 5.5", "claude-sonnet-5-5": "Claude Sonnet 5.5",
               "claude-haiku-5-5": "Claude Haiku 5.5"}


def _auto_name(model: str, day=None) -> str:
    from datetime import date
    return f"{MODEL_NAMES.get(model, model)} · {(day or date.today()).strftime('%d %b %Y')}"


def _is_auto_name(c: AIConnection) -> bool:
    """True if the name is still the generated 'Model · date' one (then it follows model changes)."""
    import re
    return bool(re.fullmatch(rf"{re.escape(MODEL_NAMES.get(c.model, c.model))} · \d{{2}} \w{{3}} \d{{4}}", c.name))


def _conn_out(c: AIConnection, active_id: int | None) -> dict:
    return {"id": c.id, "name": c.name, "provider": c.provider, "model": c.model, "created_at": c.created_at,
            "key_hint": f"••••{c.api_key[-4:]}" if len(c.api_key) >= 4 else "••••", "active": c.id == active_id,
            "auto_name": _is_auto_name(c)}


def _active_id(s: Session) -> int | None:
    row = s.get(AppSetting, "ai_active")
    return (row.value or {}).get("connection_id") if row else None


def _set_active(s: Session, cid: int | None) -> None:
    from ..llm import reset_provider
    row = s.get(AppSetting, "ai_active") or AppSetting(key="ai_active")
    row.value = {"connection_id": cid}
    s.add(row)
    s.commit()
    reset_provider()


@router.get("/api/ai/connections")
def list_connections(s: Session = Depends(get_session)):
    active = _active_id(s)
    return [_conn_out(c, active) for c in s.exec(select(AIConnection).order_by(AIConnection.id.desc())).all()]


def check_key(provider: str, api_key: str) -> tuple[bool, str]:
    """Cheap liveness check: list the provider's models with this key (no tokens used)."""
    try:
        if provider == "claude":
            import anthropic
            next(iter(anthropic.Anthropic(api_key=api_key, max_retries=0, timeout=15).models.list(limit=1)), None)
        else:
            from google import genai
            client = genai.Client(api_key=api_key)  # keep a reference: the client closes when garbage-collected
            next(iter(client.models.list()), None)
        return True, "Key works"
    except Exception as e:
        msg = str(e)
        if "401" in msg or "403" in msg or "invalid" in msg.lower() or "API key" in msg or "authentication" in msg.lower():
            return False, "This API key was rejected by the provider."
        return False, f"Could not reach the provider ({type(e).__name__})."


@router.post("/api/ai/connections/test")
def test_connection(body: AIConnectionIn):
    ok, msg = check_key(body.provider, body.api_key.strip())
    return {"valid": ok, "message": msg}


@router.post("/api/ai/connections", status_code=201)
def add_connection(body: AIConnectionIn, s: Session = Depends(get_session)):
    """Test the API key, then save it as a named connection and start using it."""
    from datetime import date
    ok, msg = check_key(body.provider, body.api_key.strip())
    if not ok:
        raise HTTPException(400, msg)
    name = (body.name or "").strip() or _auto_name(body.model, date.today())
    c = AIConnection(name=name, provider=body.provider, model=body.model, api_key=body.api_key.strip())
    s.add(c)
    s.commit()
    _set_active(s, c.id)
    return _conn_out(c, c.id)


@router.patch("/api/ai/connections/{cid}")
def edit_connection(cid: int, body: AIConnectionPatch, s: Session = Depends(get_session)):
    """Change model, name or key of a saved connection. A generated name follows the new model."""
    from ..llm import reset_provider
    c = s.get(AIConnection, cid)
    if not c:
        raise HTTPException(404, "Connection not found")
    key = (body.api_key or "").strip()
    provider = body.provider or c.provider
    if provider != c.provider and not key:
        raise HTTPException(400, "A different provider needs its own API key.")
    if key:
        ok, msg = check_key(provider, key)
        if not ok:
            raise HTTPException(400, msg)
        c.api_key = key
    auto = _is_auto_name(c)
    c.provider = provider
    if body.model:
        c.model = body.model
    if body.name is not None and body.name.strip() and body.name.strip() != c.name:
        c.name = body.name.strip()  # custom name
    elif body.name is not None and not body.name.strip() or auto:
        c.name = _auto_name(c.model, c.created_at.date())  # generated name, keeps the creation date
    s.add(c)
    s.commit()
    if _active_id(s) == cid:
        reset_provider()  # the judge picks up the new model right away
    return _conn_out(c, _active_id(s))


@router.post("/api/ai/connections/{cid}/activate")
def activate_connection(cid: int, s: Session = Depends(get_session)):
    c = s.get(AIConnection, cid)
    if not c:
        raise HTTPException(404, "Connection not found")
    _set_active(s, cid)
    return _conn_out(c, cid)


@router.delete("/api/ai/connections/{cid}")
def delete_connection(cid: int, s: Session = Depends(get_session)):
    c = s.get(AIConnection, cid)
    if not c:
        raise HTTPException(404, "Connection not found")
    was_active = _active_id(s) == cid
    s.delete(c)
    s.commit()
    if was_active:  # fall back to the most recent remaining connection
        nxt = s.exec(select(AIConnection).order_by(AIConnection.id.desc())).first()
        _set_active(s, nxt.id if nxt else None)
    return {"ok": True}


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
            texts.append(f"--- Page: {e.get('h1') or p.url}\n{(e.get('content_text') or e['text'])[:12000]}")
    if not texts:
        raise HTTPException(404, "No readable pages in the latest audit")
    answer = simulate_shopper(body.question, "\n\n".join(texts), retailer.name)
    return {"retailer": retailer.name, "question": body.question, "answer": answer, "pages_used": len(texts)}
