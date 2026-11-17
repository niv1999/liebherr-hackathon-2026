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


def _load_demo_snapshot() -> None:
    """Hosted demo: if the runtime folder is empty, start from the bundled snapshot (app/demo)."""
    import os
    import shutil
    from pathlib import Path

    snap = Path(os.getenv("LPR_DEMO_SNAPSHOT", settings.APP_DIR / "demo"))
    db = settings.RUNTIME_DIR / "lpr.db"
    if db.exists() or not (snap / "lpr.db").exists():
        return
    shutil.copy2(snap / "lpr.db", db)
    for sub in ("artifacts", "logos"):
        if (snap / sub).exists():
            shutil.copytree(snap / sub, settings.RUNTIME_DIR / sub, dirs_exist_ok=True)
    logging.getLogger("lpr").info("loaded demo snapshot from %s", snap)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.ensure_dirs()
    _load_demo_snapshot()
    init_db()
    with session_scope() as s:
        logging.getLogger("lpr").info("seed: %s", seed_all(s))
    jobs.recover_stale_runs()
    jobs.start_scheduler()
    yield
    jobs.stop_scheduler()


app = FastAPI(title="HeLPR API", version="0.1", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
for r in (routes_retailers, routes_criteria, routes_audits, routes_misc):
    app.include_router(r.router)
settings.ensure_dirs()
app.mount("/artifacts", StaticFiles(directory=settings.ARTIFACTS_DIR), name="artifacts")


@app.get("/api/health")
def health():
    return {"ok": True}


# Serve the built frontend (app/frontend/dist) from the same server, so HeLPR runs as one service.
_DIST = settings.APP_DIR / "frontend" / "dist"
if _DIST.exists():
    from fastapi import HTTPException
    from fastapi.responses import FileResponse

    app.mount("/assets", StaticFiles(directory=_DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        if path.startswith(("api/", "artifacts/")):
            raise HTTPException(404)
        f = _DIST / path
        return FileResponse(f if path and f.is_file() else _DIST / "index.html")
