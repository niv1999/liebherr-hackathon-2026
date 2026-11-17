"""Load reference data, criteria and retailers into the DB.

Only inserts rows that don't exist yet (by model / code / name), so edits made
through the UI are never overwritten. Products are refreshed from the reference file.
"""
from __future__ import annotations

import json

import yaml
from sqlmodel import Session, select

from . import settings
from .models import AppSetting, Criterion, Product, Retailer

PRODUCT_COLUMNS = ["article_no", "ean", "sk", "category", "series", "uvp_eur", "height_mm", "width_mm",
                   "depth_mm", "energy_class", "noise_db", "door_hinge", "handle"]
DATA_KEYS = ["product_type", "eprel", "new_or_discontinued", "volume_l", "key_features", "features",
             "images", "documents", "videos", "attributes", "in_product_data"]


def seed_products(s: Session) -> int:
    ref = json.loads(settings.REFERENCE_FILE.read_text(encoding="utf-8"))
    existing = {p.model: p for p in s.exec(select(Product)).all()}
    for item in ref["products"]:
        p = existing.get(item["model"]) or Product(model=item["model"])
        for c in PRODUCT_COLUMNS:
            setattr(p, c, item.get(c))
        p.data = {k: item.get(k) for k in DATA_KEYS}
        s.add(p)
    s.commit()
    return len(ref["products"])


def seed_criteria(s: Session) -> int:
    items = yaml.safe_load(settings.CRITERIA_FILE.read_text(encoding="utf-8"))
    have = {c.code for c in s.exec(select(Criterion)).all()}
    added = 0
    for item in items:
        if item["code"] in have:
            continue
        item = {**item, "sk_levels": str(item.get("sk_levels", "1,2,3"))}
        s.add(Criterion(**item))
        added += 1
    s.commit()
    return added


def seed_retailers(s: Session) -> int:
    items = yaml.safe_load(settings.RETAILERS_FILE.read_text(encoding="utf-8"))
    have = {r.name for r in s.exec(select(Retailer)).all()}
    added = 0
    for item in items:
        if item["name"] not in have:
            s.add(Retailer(**item))
            added += 1
    s.commit()
    return added


def seed_settings(s: Session) -> None:
    if not s.get(AppSetting, "schedule"):
        s.add(AppSetting(key="schedule", value={"enabled": False, "interval_days": 7}))
    if not s.get(AppSetting, "audit_defaults"):
        s.add(AppSetting(key="audit_defaults", value={"samples_per_sk": settings.SAMPLES_PER_SK, "due_days": 30}))
    s.commit()


def seed_all(s: Session) -> dict:
    return {
        "products": seed_products(s),
        "criteria_added": seed_criteria(s),
        "retailers_added": seed_retailers(s),
        "settings": seed_settings(s) or "ok",
        "ai": migrate_env_ai_keys(s) or "ok",
    }


def migrate_env_ai_keys(s: Session) -> None:
    """One-time: API keys from the old settings (app/.env) become saved AI connections."""
    import os
    from datetime import date

    from .models import AIConnection

    if s.exec(select(AIConnection)).first():
        return
    names = {"gemini-2.5-flash": "Gemini 2.5 Flash", "claude-opus-5-5": "Claude Opus 5.5",
             "claude-sonnet-5-5": "Claude Sonnet 5.5", "claude-haiku-5-5": "Claude Haiku 5.5"}
    today = date.today().strftime("%d %b %Y")
    made = {}
    if os.getenv("GEMINI_API_KEY"):
        m = os.getenv("GEMINI_MODEL", settings.GEMINI_MODEL)
        made["gemini"] = AIConnection(name=f"{names.get(m, m)} · {today}", provider="gemini", model=m,
                                      api_key=os.environ["GEMINI_API_KEY"])
    if os.getenv("ANTHROPIC_API_KEY"):
        m = os.getenv("CLAUDE_MODEL", settings.CLAUDE_MODEL)
        made["claude"] = AIConnection(name=f"{names.get(m, m)} · {today}", provider="claude", model=m,
                                      api_key=os.environ["ANTHROPIC_API_KEY"])
    for c in made.values():
        s.add(c)
    s.commit()
    preferred = made.get(os.getenv("LPR_LLM_PROVIDER", "")) or next(iter(made.values()), None)
    if preferred:
        s.add(AppSetting(key="ai_active", value={"connection_id": preferred.id}))
        s.commit()
