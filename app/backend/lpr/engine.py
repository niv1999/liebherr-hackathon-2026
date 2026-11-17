"""Checks one page: TOOLS first (rule checks: free, exact), then the two AI JUDGES (one call each),
fed with the tools' results. Used by the audit and by re-judging saved pages."""
from __future__ import annotations

from sqlmodel import Session

from .checks import REGISTRY, CheckContext, CheckResult
from .judges import judge_kind, run_judge
from .models import Criterion, Product, Retailer


def check_page(s: Session, retailer: Retailer, criteria: list[Criterion], product: Product, page: dict,
               raw_page: dict | None, raw_status: int | None, robots: str | None, image_info: list[dict],
               screenshot_path: str | None, blocked_reason: str | None,
               feedback_fn=None) -> list[tuple[Criterion, CheckResult]]:
    applicable = [c for c in criteria if c.page_type == "product" and c.applies_to_sk(product.sk)]
    if blocked_reason:
        return [(c, CheckResult("needs_human", f"Page could not be checked automatically ({blocked_reason}).")) for c in applicable]

    results: dict[int, CheckResult] = {}
    ai_criteria: list[Criterion] = []

    def ctx_for(c: Criterion) -> CheckContext:
        return CheckContext(retailer=retailer, criterion=c, product=product, page=page, raw_page=raw_page,
                            raw_status=raw_status, robots_txt=robots, image_info=image_info,
                            screenshot_path=screenshot_path)

    # 1) Tools: rule checks and manual criteria
    for c in applicable:
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

    # 2) Tool facts for the AI judges (what the rules already measured on this page)
    facts = [f"{c.code} {c.title}: {results[c.id].status.upper()} ({results[c.id].reasoning})"
             for c in applicable if c.id in results and c.method == "rule"]
    facts.append(f"Page content length: about {len((page.get('content_text') or '').split())} words "
                 "(without navigation)")

    # 3) AI judges: one call per judge type for all its criteria
    feedback = {c.id: feedback_fn(c.id) for c in ai_criteria} if feedback_fn else {}
    for kind in ("content", "vision"):
        group = [c for c in ai_criteria if judge_kind(c) == kind]
        if group:
            results.update(run_judge(kind, ctx_for(group[0]), group, facts, feedback))

    return [(c, results[c.id]) for c in applicable if c.id in results]
