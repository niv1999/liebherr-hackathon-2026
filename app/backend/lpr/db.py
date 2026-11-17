"""Database engine and session helpers (SQLite via SQLModel)."""
from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

from sqlmodel import Session, SQLModel, create_engine

from . import settings

settings.ensure_dirs()
engine = create_engine(settings.DB_URL, connect_args={"check_same_thread": False})


def init_db() -> None:
    from . import models  # noqa: F401  (register tables)

    SQLModel.metadata.create_all(engine)


@contextmanager
def session_scope() -> Iterator[Session]:
    with Session(engine, expire_on_commit=False) as s:
        yield s


def get_session() -> Iterator[Session]:
    """FastAPI dependency."""
    with Session(engine, expire_on_commit=False) as s:
        yield s
