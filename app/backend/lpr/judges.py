"""The two specialist AI judges. Each judges ALL its criteria for one page in ONE call.

  content judge: reads the page text and compares it with Liebherr's official texts
                 (feature benefits, description quality, AI shopper test, new text criteria)
  vision judge:  looks at the screenshot (+ page text) for visual criteria (design, premium page, UI-made criteria)

Both receive the "tool facts": results the rule checks already measured on the same page (feature counts,
dimensions found, structured data …), so the AI doesn't redo counting and focuses on judgement.
"""
from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field

from . import settings
from .checks.ai import PAGE_TEXT_LIMIT, _official_features, _product_facts, niche_for
from .checks.base import CheckContext, CheckResult
from .llm import get_provider
from .models import Criterion

VISION_KEYS = {"ai_design_quality", "ai_premium_page", "ai_generic"}


def judge_kind(c: Criterion) -> str:
    return "vision" if (c.rule_key or "ai_generic") in VISION_KEYS else "content"


class CriterionJudgement(BaseModel):
    code: str = Field(description="criterion code, e.g. PDP-05")
    verdict: Literal["pass", "fail", "unsure"]
    confidence: float = Field(ge=0, le=1)
    reasoning: str = Field(description="2-4 sentences in English")
    evidence: list[str] = Field(default_factory=list, description="short quotes / observations")


class BatchJudgement(BaseModel):
    results: list[CriterionJudgement]


ROLE = {
    "content": "You are the CONTENT JUDGE of an audit tool for Liebherr-Hausgeräte. You judge the TEXT of a German "
               "retailer's product page against Liebherr's official product data.",
    "vision": "You are the VISION JUDGE of an audit tool for Liebherr-Hausgeräte. You judge how a German retailer's "
              "product page LOOKS, using the attached screenshot of the first screen, plus the page text.",
}


def _criterion_block(c: Criterion, product, feedback: list[dict]) -> str:
    instr = (c.ai_prompt or c.title).replace("{niche}", niche_for(product)).strip()
    fb = ""
    if feedback:
        fb = "\n  Past corrections by Liebherr reviewers (follow them):\n" + "\n".join(
            f"  - AI said '{f.get('ai_status')}', reviewer: '{f.get('corrected_status') or 'n/a'}': {f.get('comment')}"
            for f in feedback)
    return f"### {c.code}: {c.title}\n{instr}{fb}"


def build_prompt(kind: str, ctx: CheckContext, criteria: list[Criterion], tool_facts: list[str],
                 feedback: dict[int, list[dict]]) -> str:
    needs_features = any(c.rule_key in ("ai_feature_benefits", "ai_premium_page") for c in criteria)
    parts = [
        ROLE[kind],
        f"Judge each of the {len(criteria)} criteria below independently. For each give verdict pass / fail / unsure, "
        "a confidence 0-1, short English reasoning and evidence quotes. Use 'unsure' rather than guessing.",
        f"\n## Product (Liebherr master data)\n{_product_facts(ctx)}",
    ]
    if needs_features:
        parts.append(f"\n## Official Liebherr features and benefit texts\n{_official_features(ctx)}")
    if tool_facts:
        parts.append("\n## Facts already measured by the tool's rule checks on this page (trust these)\n" +
                     "\n".join(f"- {t}" for t in tool_facts))
    parts.append("\n## Criteria to judge\n" + "\n\n".join(_criterion_block(c, ctx.product, feedback.get(c.id, []))
                                                         for c in criteria))
    text = (ctx.page.get("content_text") or ctx.page.get("text") or "")[:PAGE_TEXT_LIMIT]
    parts.append(f"\n## Retailer page\nURL: {ctx.page.get('url')}\nTitle: {ctx.page.get('h1') or ctx.page.get('title')}\n"
                 f"Text (German, navigation removed, may be truncated):\n\"\"\"\n{text}\n\"\"\"")
    return "\n".join(parts)


def run_judge(kind: str, ctx: CheckContext, criteria: list[Criterion], tool_facts: list[str],
              feedback: dict[int, list[dict]]) -> dict[int, CheckResult]:
    """One AI call for all `criteria` of this judge on this page. Returns criterion_id -> result."""
    provider = get_provider()
    if not provider.available:
        return {c.id: CheckResult("needs_human", "AI judge not configured (no API key); needs a manual check.",
                                  source="ai") for c in criteria}
    prompt = build_prompt(kind, ctx, criteria, tool_facts, feedback)
    images = [Path(ctx.screenshot_path)] if kind == "vision" and ctx.screenshot_path else []
    try:
        batch: BatchJudgement = provider.judge(prompt, images, schema=BatchJudgement)
    except Exception as e:
        return {c.id: CheckResult("needs_human", f"AI {kind} judge unavailable ({type(e).__name__}); needs a manual check.",
                                  {"error": str(e)[:200]}, source="ai") for c in criteria}
    by_code = {r.code.strip().upper(): r for r in batch.results}
    out = {}
    for c in criteria:
        j = by_code.get(c.code.upper())
        if j is None:
            out[c.id] = CheckResult("needs_human", "The AI judge returned no verdict for this criterion.", source="ai")
            continue
        status = {"pass": "pass", "fail": "fail"}.get(j.verdict, "needs_human")
        if status != "needs_human" and j.confidence < settings.AI_CONFIDENCE_THRESHOLD:
            status = "needs_human"  # Review step: unsure verdicts go to a human
        out[c.id] = CheckResult(status, j.reasoning, {"quotes": j.evidence, "ai_verdict": j.verdict, "judge": kind},
                                j.confidence, source="ai")
    return out


def run_verify(ctx: CheckContext, criteria: list[Criterion], rule_results: dict[int, CheckResult],
               tiles: list[Path]) -> dict[int, CheckResult]:
    """Escalation: the rule check did not find the information in the page text. The vision judge looks at
    screenshots of the WHOLE page (tiles, top to bottom). Found -> pass; not found -> the rule fail is confirmed."""
    provider = get_provider()
    if not provider.available:
        return {}
    blocks = "\n\n".join(
        f"### {c.code}: {c.title}\nThe text rule reported: {rule_results[c.id].reasoning}\n"
        "Is this information VISIBLY present anywhere on the page screenshots? PASS if you can see it "
        "(quote where), FAIL if it is not there, UNSURE if unreadable." for c in criteria)
    prompt = (f"{ROLE['vision']}\nYou get {len(tiles)} screenshots of the same page, from top to bottom.\n"
              "An automatic text check could not find some information. Double-check each item below.\n\n"
              f"## Product\n{_product_facts(ctx)}\n\n## Items to verify\n{blocks}")
    try:
        batch: BatchJudgement = provider.judge(prompt, tiles, schema=BatchJudgement)
    except Exception:
        return {}  # keep the rule results
    out = {}
    by_code = {r.code.strip().upper(): r for r in batch.results}
    for c in criteria:
        j = by_code.get(c.code.upper())
        rule = rule_results[c.id]
        if j is None:
            continue
        ev = {**rule.evidence, "escalated": True, "vision_verdict": j.verdict, "vision_quotes": j.evidence}
        if j.verdict == "pass" and j.confidence >= settings.AI_CONFIDENCE_THRESHOLD:
            out[c.id] = CheckResult("pass", "Not found in the page text, but the vision judge found it on the page: "
                                    f"{j.reasoning}", ev, j.confidence, source="ai")
        elif j.verdict == "fail":
            out[c.id] = CheckResult("fail", f"{rule.reasoning} Confirmed by the vision judge on the full page.",
                                    ev, max(j.confidence, 0.8), source="rule")
        else:
            out[c.id] = CheckResult("needs_human", f"{rule.reasoning} The vision judge could not confirm it either way.",
                                    ev, j.confidence, source="ai")
    return out
