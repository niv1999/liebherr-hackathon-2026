"""FastAPI app. Run (from repo root):
    app/.venv/Scripts/python.exe -X utf8 -m uvicorn lpr.api:app --app-dir app/backend --port 8000
Interactive API docs: http://localhost:8000/docs
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .. import jobs, settings
from ..db import init_db, session_scope
from ..seed import seed_all
from . import routes_audits, routes_criteria, routes_misc, routes_retailers

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.ensure_dirs()
    init_db()
    with session_scope() as s:
        logging.getLogger("lpr").info("seed: %s", seed_all(s))
    jobs.recover_stale_runs()
    jobs.start_scheduler()
    yield
    jobs.stop_scheduler()


app = FastAPI(title="LPR Inspector API", version="0.1", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
for r in (routes_retailers, routes_criteria, routes_audits, routes_misc):
    app.include_router(r.router)
settings.ensure_dirs()
app.mount("/artifacts", StaticFiles(directory=settings.ARTIFACTS_DIR), name="artifacts")


@app.get("/api/health")
def health():
    return {"ok": True}
