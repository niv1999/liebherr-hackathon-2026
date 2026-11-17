"""Checks one page: TOOLS first (rule checks: free, exact), then the AI JUDGES (one call each), fed with the
tools' results, then ESCALATION: rule fails of the kind "not found in the text" are double-checked by the vision
judge on screenshots of the whole page (so a retailer isn't failed only because our parser missed something).
Used by the audit and by re-judging saved pages."""
from __future__ import annotations

from pathlib import Path

from sqlmodel import Session

from . import settings
from .checks import REGISTRY, CheckContext, CheckResult
from .judges import judge_kind, run_judge, run_verify
from .models import Criterion, Product, Retailer


def applicable(criteria: list[Criterion], page_types: tuple[str, ...], product: Product | None) -> list[Criterion]:
    sk = product.sk if product else None
    # product criteria follow the product's SK class; shop-wide / brand criteria are checked once per retailer
    # (their SK relevance is applied in the per-SK score)
    return [c for c in criteria if c.active and c.page_type in page_types
            and c.rule_key not in RUN_LEVEL_RULES  # decided once per audit elsewhere (e.g. by the listing count)
            and (product is None or c.page_type != "product" or c.applies_to_sk(sk))]


RUN_LEVEL_RULES = {"available_per_sk"}


def fullpage_tiles(fullpage_path: str | None, max_tiles: int = 5, tile_h: int = 1600) -> list[Path]:
    """Cut a tall full-page screenshot into readable tiles (an AI can't read a 15 000 px image scaled down)."""
    if not fullpage_path or not Path(fullpage_path).exists():
        return []
    from PIL import Image

    src = Path(fullpage_path)
    out = []
    with Image.open(src) as im:
        w, h = im.size
        for i in range(min(max_tiles, (h + tile_h - 1) // tile_h)):
            p = src.with_name(f"{src.stem}_tile{i}.jpg")
            if not p.exists():
                im.crop((0, i * tile_h, w, min(h, (i + 1) * tile_h))).convert("RGB").save(p, quality=70)
            out.append(p)
    return out


def check_page(s: Session, retailer: Retailer, criteria: list[Criterion], product: Product | None, page: dict,
               raw_page: dict | None, raw_status: int | None, robots: str | None, image_info: list[dict],
               screenshot_path: str | None, blocked_reason: str | None, feedback_fn=None,
               page_types: tuple[str, ...] = ("product",), fullpage_path: str | None = None
               ) -> list[tuple[Criterion, CheckResult]]:
    todo = applicable(criteria, page_types, product)
    if blocked_reason:
        return [(c, CheckResult("needs_human", f"Page could not be checked automatically ({blocked_reason}).")) for c in todo]

    results: dict[int, CheckResult] = {}
    ai_criteria: list[Criterion] = []

    def ctx_for(c: Criterion) -> CheckContext:
        return CheckContext(retailer=retailer, criterion=c, product=product, page=page, raw_page=raw_page,
                            raw_status=raw_status, robots_txt=robots, image_info=image_info,
                            screenshot_path=screenshot_path, fullpage_path=fullpage_path)

    # 1) Tools: rule checks and manual criteria
    for c in todo:
        if c.method == "manual":
            results[c.id] = CheckResult("needs_human", "Not visible online: needs a manual check or Liebherr's internal data.",
                                        source="manual")
        elif c.method == "ai":
            ai_criteria.append(c)
        else:
            fn = REGISTRY.get(c.rule_key or "")
            if not fn:
                results[c.id] = CheckResult("needs_human", f"No automatic check implemented yet ({c.rule_key}).")
                continue
            try:
                results[c.id] = fn(ctx_for(c))
            except Exception as e:
                results[c.id] = CheckResult("error", f"Check crashed: {type(e).__name__}: {e}")

    # 2) Tool facts for the AI judges
    facts = [f"{c.code} {c.title}: {results[c.id].status.upper()} ({results[c.id].reasoning})"
             for c in todo if c.id in results and c.method == "rule"]
    facts.append(f"Page content length: about {len((page.get('content_text') or '').split())} words (without navigation)")

    feedback = {c.id: feedback_fn(c.id) for c in ai_criteria} if feedback_fn else {}
    # 3) AI judges: one call per judge type for all its criteria
    for kind in ("content", "vision"):
        group = [c for c in ai_criteria if judge_kind(c) == kind]
        if group:
            results.update(run_judge(kind, ctx_for(group[0]), group, facts, feedback))

    # 4) Escalation: rule said "not found" -> vision judge looks at the whole page
    escalate = [c for c in todo if c.escalate and c.id in results and results[c.id].status == "fail"]
    tiles = fullpage_tiles(fullpage_path) if escalate and settings.ESCALATION_ENABLED else []
    if escalate and tiles:
        verified = run_verify(ctx_for(escalate[0]), escalate, {c.id: results[c.id] for c in escalate}, tiles)
        results.update(verified)

    return [(c, results[c.id]) for c in todo if c.id in results]
