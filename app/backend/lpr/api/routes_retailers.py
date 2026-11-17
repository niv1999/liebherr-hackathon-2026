from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..db import get_session
from ..models import Product, Retailer, RetailerProductUrl
from ..services import latest_runs, retailer_overview, run_summary
from .schemas import ProductUrlIn, RetailerIn, RetailerPatch

router = APIRouter(prefix="/api/retailers", tags=["retailers"])


def _get(s: Session, rid: int) -> Retailer:
    r = s.get(Retailer, rid)
    if not r:
        raise HTTPException(404, "Retailer not found")
    return r


@router.get("")
def list_retailers(include_inactive: bool = False, s: Session = Depends(get_session)):
    out = []
    for r in s.exec(select(Retailer).order_by(Retailer.name)).all():
        if not r.active and not include_inactive:
            continue
        runs = latest_runs(s, r.id, 2)
        last_any = latest_runs(s, r.id, 1, done_only=False)
        out.append({**r.model_dump(), "latest_run": run_summary(runs[0] if runs else None, runs[1] if len(runs) > 1 else None),
                    "current_run": run_summary(last_any[0]) if last_any and last_any[0].status in ("queued", "running") else None})
    return out


@router.post("", status_code=201)
def create_retailer(body: RetailerIn, s: Session = Depends(get_session)):
    if s.exec(select(Retailer).where(Retailer.name == body.name)).first():
        raise HTTPException(409, "A retailer with this name exists")
    r = Retailer(**body.model_dump())
    s.add(r)
    s.commit()
    return r


@router.get("/{rid}")
def get_retailer(rid: int, s: Session = Depends(get_session)):
    return _get(s, rid)


@router.patch("/{rid}")
def update_retailer(rid: int, body: RetailerPatch, s: Session = Depends(get_session)):
    r = _get(s, rid)
    old_url = r.base_url
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(r, k, v)
    s.add(r)
    s.commit()
    if r.base_url != old_url:  # other shop address -> fetch its icon again
        from ..logos import clear_logo
        clear_logo(r.id)
    return r


@router.delete("/{rid}")
def deactivate_retailer(rid: int, s: Session = Depends(get_session)):
    """Soft delete: keeps the audit history."""
    r = _get(s, rid)
    r.active = False
    s.add(r)
    s.commit()
    return {"ok": True}


@router.get("/{rid}/overview")
def overview(rid: int, run_id: Optional[int] = None, s: Session = Depends(get_session)):
    """Scorecard of the latest audit, or of an older one with ?run_id=."""
    return retailer_overview(s, _get(s, rid), run_id)


@router.get("/{rid}/history")
def history(rid: int, s: Session = Depends(get_session)):
    return retailer_overview(s, _get(s, rid))["history"]


@router.get("/{rid}/product-urls")
def product_urls(rid: int, s: Session = Depends(get_session)):
    _get(s, rid)
    prods = {p.id: p for p in s.exec(select(Product)).all()}
    rows = s.exec(select(RetailerProductUrl).where(RetailerProductUrl.retailer_id == rid)).all()
    return [{**u.model_dump(), "model": prods[u.product_id].model, "sk": prods[u.product_id].sk} for u in rows]


@router.post("/{rid}/product-urls", status_code=201)
def add_product_url(rid: int, body: ProductUrlIn, s: Session = Depends(get_session)):
    """Hand-picked product page URL; overrides the automatic search for this model."""
    _get(s, rid)
    p = s.get(Product, body.product_id) if body.product_id else \
        s.exec(select(Product).where(Product.model == (body.model or ""))).first()
    if not p:
        raise HTTPException(404, "Product not found (give product_id or exact model name)")
    for old in s.exec(select(RetailerProductUrl).where(RetailerProductUrl.retailer_id == rid,
                                                        RetailerProductUrl.product_id == p.id)).all():
        s.delete(old)
    u = RetailerProductUrl(retailer_id=rid, product_id=p.id, url=body.url, source="manual")
    s.add(u)
    s.commit()
    return u


@router.delete("/{rid}/product-urls/{uid}")
def delete_product_url(rid: int, uid: int, s: Session = Depends(get_session)):
    u = s.get(RetailerProductUrl, uid)
    if not u or u.retailer_id != rid:
        raise HTTPException(404, "Not found")
    s.delete(u)
    s.commit()
    return {"ok": True}


@router.get("/{rid}/logo")
def logo(rid: int, s: Session = Depends(get_session)):
    """The shop's own icon (apple-touch-icon / favicon), fetched once and cached. 404 -> the UI shows initials."""
    from fastapi.responses import FileResponse

    from ..logos import retailer_logo
    r = _get(s, rid)
    path = retailer_logo(r.id, r.base_url)
    if not path:
        raise HTTPException(404, "No logo found")
    # no-cache = browser revalidates (ETag) so a re-fetched icon shows at once; CSP blocks scripts in SVGs
    return FileResponse(path, headers={"Cache-Control": "no-cache", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'"})
