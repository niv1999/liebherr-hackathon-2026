"""Scoring: weighted passed / weighted checked, with coverage and a separate AI-readiness score."""
from __future__ import annotations

from collections import defaultdict

from . import settings
from .models import Criterion, Verdict

CHECKED = {"pass", "fail"}


def weight(c: Criterion) -> float:
    w = settings.PRIORITY_WEIGHTS.get(c.priority, 2.0)
    if c.block != "ai_readiness":
        w *= settings.BLOCK_WEIGHTS.get(c.block, 1.0)
    if c.return_risk:
        w *= settings.RETURN_RISK_MULTIPLIER
    return w


def _pct(num: float, den: float) -> float | None:
    return round(100 * num / den, 1) if den else None


def score(verdicts: list[Verdict], criteria: dict[int, Criterion]) -> dict:
    lpr_num = lpr_den = air_num = air_den = 0.0
    checked = applicable = return_risks = 0
    blocks: dict[str, dict] = defaultdict(lambda: {"num": 0.0, "den": 0.0, "passed": 0, "failed": 0, "unchecked": 0})
    for v in verdicts:
        c = criteria.get(v.criterion_id)
        if not c:
            continue
        st = v.effective_status
        if st == "not_applicable":
            continue
        b = blocks[c.block]
        if c.block != "ai_readiness":
            applicable += 1
        if st not in CHECKED:
            b["unchecked"] += 1
            continue
        w = weight(c)
        passed = st == "pass"
        b["num"] += w * passed
        b["den"] += w
        b["passed" if passed else "failed"] += 1
        if c.block == "ai_readiness":
            air_num += w * passed
            air_den += w
        else:
            checked += 1
            lpr_num += w * passed
            lpr_den += w
            if c.return_risk and not passed:
                return_risks += 1
    return {
        "lpr_score": _pct(lpr_num, lpr_den),
        "ai_readiness_score": _pct(air_num, air_den),
        "checked_count": checked,
        "applicable_count": applicable,
        "return_risk_count": return_risks,
        "block_scores": {k: {"score": _pct(b["num"], b["den"]), "passed": b["passed"], "failed": b["failed"],
                             "unchecked": b["unchecked"]} for k, b in blocks.items()},
    }
