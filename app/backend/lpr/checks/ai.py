"""AI-judged checks. The instruction text comes from the criterion (editable in the UI);
this module adds the page context, official Liebherr data and past human corrections."""
from __future__ import annotations

import math
from pathlib import Path

from .. import settings
from ..llm import get_provider
from .base import CheckContext, CheckResult, register

PAGE_TEXT_LIMIT = 14_000


def _product_facts(ctx: CheckContext) -> str:
    p = ctx.product
    if not p:
        return ""
    return (f"Model: Liebherr {p.model} (assortment class SK{p.sk}, series {p.series}). "
            f"Official dimensions H/W/D: {p.height_mm}/{p.width_mm}/{p.depth_mm} mm. Energy class {p.energy_class}, "
            f"noise {p.noise_db} dB. Door hinge: {p.door_hinge}. Handle: {p.handle}.")


def _official_features(ctx: CheckContext, limit: int = 12) -> str:
    data = (ctx.product.data if ctx.product else {}) or {}
    feats = (data.get("key_features") or []) + (data.get("features") or [])
    seen, lines = set(), []
    for f in feats:
        if f["title"].lower() in seen:
            continue
        seen.add(f["title"].lower())
        lines.append(f"- {f['title']}: {(f.get('text') or '')[:400]}")
        if len(lines) >= limit:
            break
    return "\n".join(lines)


def _feedback_block(ctx: CheckContext) -> str:
    if not ctx.feedback_examples:
        return ""
    lines = [f"- On a previous page the AI said '{f.get('ai_status')}', a Liebherr reviewer corrected it to "
             f"'{f.get('corrected_status') or 'n/a'}': {f.get('comment')}" for f in ctx.feedback_examples]
    return "\n\nPast corrections from Liebherr reviewers for this criterion (follow their guidance):\n" + "\n".join(lines)


def run_ai(ctx: CheckContext, extra: str = "", use_screenshot: bool = False, instruction: str | None = None) -> CheckResult:
    provider = get_provider()
    if not provider.available:
        return CheckResult("needs_human", "AI judge not configured (no API key), so this criterion needs a manual check.",
                           {}, None, source="ai")
    instruction = (instruction or ctx.criterion.ai_prompt or ctx.criterion.title).strip()
    prompt = (
        f"{instruction}\n\n"
        f"Criterion: {ctx.criterion.code} {ctx.criterion.title}\n"
        f"Product facts (from Liebherr master data): {_product_facts(ctx)}\n"
        f"{extra}"
        f"{_feedback_block(ctx)}\n\n"
        f"Retailer page URL: {ctx.page.get('url')}\n"
        f"Retailer page title: {ctx.page.get('h1') or ctx.page.get('title')}\n"
        f"Retailer page text (German, may be truncated):\n\"\"\"\n{(ctx.page.get('content_text') or ctx.page.get('text') or '')[:PAGE_TEXT_LIMIT]}\n\"\"\"\n\n"
        "Answer with verdict pass / fail / unsure, a confidence between 0 and 1, short reasoning in English and evidence quotes."
    )
    images = [Path(ctx.screenshot_path)] if use_screenshot and ctx.screenshot_path else []
    try:
        j = provider.judge(prompt, images)
    except Exception as e:
        return CheckResult("needs_human", f"AI call failed ({type(e).__name__}); needs a manual check.",
                           {"error": str(e)[:300]}, None, source="ai")
    status = {"pass": "pass", "fail": "fail"}.get(j.verdict, "needs_human")
    if status != "needs_human" and j.confidence < settings.AI_CONFIDENCE_THRESHOLD:
        status = "needs_human"
    return CheckResult(status, j.reasoning, {"quotes": j.evidence, "ai_verdict": j.verdict}, j.confidence, source="ai")


@register("ai_feature_benefits")
def ai_feature_benefits(ctx: CheckContext) -> CheckResult:
    extra = f"Official Liebherr features and benefit texts for this model:\n{_official_features(ctx)}\n"
    return run_ai(ctx, extra)


@register("ai_design_quality")
def ai_design_quality(ctx: CheckContext) -> CheckResult:
    return run_ai(ctx, use_screenshot=True)


@register("ai_premium_page")
def ai_premium_page(ctx: CheckContext) -> CheckResult:
    return run_ai(ctx, f"Official features:\n{_official_features(ctx, 8)}\n", use_screenshot=True)


@register("ai_seo_description")
def ai_seo_description(ctx: CheckContext) -> CheckResult:
    return run_ai(ctx)


@register("ai_generic")
def ai_generic(ctx: CheckContext) -> CheckResult:
    """For criteria created in the UI: only the criterion's own instruction + screenshot + page text."""
    return run_ai(ctx, use_screenshot=True)


def niche_for(product) -> str:
    if not product or not product.height_mm or not product.width_mm:
        return "60 cm wide and 186 cm high"
    w = max(60, math.ceil(product.width_mm / 10))
    h = math.ceil(product.height_mm / 10) + 1
    return f"{w} cm wide and {h} cm high"


@register("ai_shopper_test")
def ai_shopper_test(ctx: CheckContext) -> CheckResult:
    instruction = (ctx.criterion.ai_prompt or "").replace("{niche}", niche_for(ctx.product))
    return run_ai(ctx, instruction=instruction)


def simulate_shopper(question: str, page_text: str, retailer_name: str) -> str:
    """Free-text answer for the live AI shopper simulator (feature #25)."""
    provider = get_provider()
    if not provider.available:
        return "AI not configured: add GEMINI_API_KEY to app/.env to use the simulator."
    prompt = (f"You are an AI shopping assistant. Answer the shopper's question in the language of the question, "
              f"using ONLY the information from {retailer_name}'s product page(s) below. If the pages don't contain "
              f"the information, say clearly what is missing instead of guessing.\n\nShopper question: {question}\n\n"
              f"Retailer page text:\n\"\"\"\n{page_text[:30000]}\n\"\"\"")
    return provider.answer(prompt)
