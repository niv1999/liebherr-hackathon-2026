"""Background audit jobs (in-process, one at a time to spare RAM) and the interval scheduler."""
from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from sqlmodel import select

from .audit import run_audit
from .db import session_scope
from .models import AppSetting, AuditRun, Retailer

log = logging.getLogger("lpr.jobs")
_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="audit")
_scheduler: BackgroundScheduler | None = None
JOB_ID = "scheduled-audits"


def enqueue(run_id: int) -> None:
    _executor.submit(run_audit, run_id)


def create_runs(retailer_ids: list[int] | None, trigger: str = "manual", started_by: str | None = None,
                criterion_codes: list[str] | None = None, product_ids: list[int] | None = None,
                include_listing: bool = True) -> list[int]:
    with session_scope() as s:
        q = select(Retailer).where(Retailer.active == True)  # noqa: E712
        retailers = [r for r in s.exec(q).all() if not retailer_ids or r.id in retailer_ids]
        ids = []
        for r in retailers:
            run = AuditRun(retailer_id=r.id, trigger=trigger, started_by=started_by, criterion_codes=criterion_codes,
                           product_ids=product_ids, include_listing=include_listing)
            s.add(run)
            s.commit()
            ids.append(run.id)
    for i in ids:
        enqueue(i)
    return ids


def recover_stale_runs() -> None:
    """Runs left 'running'/'queued' by a server restart are marked failed."""
    with session_scope() as s:
        for run in s.exec(select(AuditRun).where(AuditRun.status.in_(["running", "queued"]))).all():
            run.status, run.error = "failed", "Server restarted while the audit was running."
            s.add(run)
        s.commit()


def _scheduled_tick() -> None:
    log.info("scheduled audit of all active retailers")
    create_runs(None, trigger="scheduled", started_by="scheduler")


def apply_schedule() -> dict:
    """(Re)configure the interval job from the 'schedule' setting."""
    with session_scope() as s:
        cfg = (s.get(AppSetting, "schedule") or AppSetting(key="schedule", value={})).value
    if _scheduler is None:
        return cfg
    if _scheduler.get_job(JOB_ID):
        _scheduler.remove_job(JOB_ID)
    if cfg.get("enabled"):
        days = float(cfg.get("interval_days", 7))
        start = datetime.now(timezone.utc) + timedelta(days=days)
        _scheduler.add_job(_scheduled_tick, "interval", days=days, id=JOB_ID, next_run_time=start)
    job = _scheduler.get_job(JOB_ID)
    return {**cfg, "next_run": job.next_run_time.isoformat() if job and job.next_run_time else None}


def start_scheduler() -> None:
    global _scheduler
    if _scheduler is None:
        _scheduler = BackgroundScheduler(timezone="UTC")
        _scheduler.start()
    apply_schedule()


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler:
        _scheduler.shutdown(wait=False)
        _scheduler = None
