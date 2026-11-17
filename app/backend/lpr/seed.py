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
    }
