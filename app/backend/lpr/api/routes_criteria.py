from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from .. import settings
from ..checks import REGISTRY
from ..db import get_session
from ..models import Criterion, Product, Verdict, now
from ..scoring import weight
from .schemas import CriterionIn, CriterionPatch

router = APIRouter(tags=["criteria"])


def _out(c: Criterion) -> dict:
    return {**c.model_dump(), "weight": weight(c)}


@router.get("/api/criteria")
def list_criteria(block: Optional[str] = None, sk: Optional[str] = None, include_inactive: bool = True,
                  s: Session = Depends(get_session)):
    rows = s.exec(select(Criterion).order_by(Criterion.code)).all()
    return [_out(c) for c in rows
            if (not block or c.block == block) and (not sk or c.applies_to_sk(sk)) and (include_inactive or c.active)]


@router.get("/api/criteria/meta")
def meta():
    """Options for the criteria editor."""
    return {"blocks": ["visibility", "services", "advice", "ai_readiness"], "methods": ["rule", "ai", "manual"],
            "priorities": list(settings.PRIORITY_WEIGHTS), "block_weights": settings.BLOCK_WEIGHTS,
            "priority_weights": settings.PRIORITY_WEIGHTS, "return_risk_multiplier": settings.RETURN_RISK_MULTIPLIER,
            "rule_keys": sorted(k for k in REGISTRY if not k.startswith("ai_")),
            "ai_check_keys": sorted(k for k in REGISTRY if k.startswith("ai_")),
            "note": "New AI criteria can use rule_key 'ai_generic' (uses only the ai_prompt)."}


@router.post("/api/criteria", status_code=201)
def create_criterion(body: CriterionIn, s: Session = Depends(get_session)):
    if s.exec(select(Criterion).where(Criterion.code == body.code)).first():
        raise HTTPException(409, "Code already exists")
    data = body.model_dump()
    if data["method"] == "ai" and not data.get("rule_key"):
        data["rule_key"] = "ai_generic"
    c = Criterion(**data)
    s.add(c)
    s.commit()
    return _out(c)


@router.patch("/api/criteria/{cid}")
def update_criterion(cid: int, body: CriterionPatch, s: Session = Depends(get_session)):
    c = s.get(Criterion, cid)
    if not c:
        raise HTTPException(404, "Criterion not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    c.updated_at = now()
    s.add(c)
    s.commit()
    return _out(c)


@router.delete("/api/criteria/{cid}")
def delete_criterion(cid: int, s: Session = Depends(get_session)):
    """Deletes a criterion that was never used; otherwise deactivates it (keeps history)."""
    c = s.get(Criterion, cid)
    if not c:
        raise HTTPException(404, "Criterion not found")
    if s.exec(select(Verdict).where(Verdict.criterion_id == cid)).first():
        c.active = False
        s.add(c)
        s.commit()
        return {"ok": True, "deactivated": True}
    s.delete(c)
    s.commit()
    return {"ok": True, "deleted": True}


@router.get("/api/products")
def list_products(sk: Optional[str] = None, q: Optional[str] = None, s: Session = Depends(get_session)):
    rows = s.exec(select(Product).order_by(Product.model)).all()
    return [{"id": p.id, "model": p.model, "sk": p.sk, "series": p.series, "ean": p.ean, "uvp_eur": p.uvp_eur,
             "height_mm": p.height_mm, "width_mm": p.width_mm, "depth_mm": p.depth_mm,
             "energy_class": p.energy_class, "image": (p.data.get("images") or [None])[0]}
            for p in rows if (not sk or p.sk == sk) and (not q or q.lower() in p.model.lower())]


@router.get("/api/products/{pid}")
def get_product(pid: int, s: Session = Depends(get_session)):
    p = s.get(Product, pid)
    if not p:
        raise HTTPException(404, "Product not found")
    return p
