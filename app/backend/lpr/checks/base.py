"""Shared types for all checks."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Optional

from ..models import Criterion, Product, Retailer


@dataclass
class CheckContext:
    retailer: Retailer
    criterion: Criterion
    product: Optional[Product]
    page: dict[str, Any]  # output of extract.extract() for the rendered page
    raw_page: dict[str, Any] | None = None  # extract() of the plain-HTTP (no JS) page
    raw_status: int | None = None
    robots_txt: str | None = None
    image_info: list[dict] = field(default_factory=list)
    screenshot_path: str | None = None
    feedback_examples: list[dict] = field(default_factory=list)


@dataclass
class CheckResult:
    status: str  # pass | fail | needs_human | not_applicable | error
    reasoning: str
    evidence: dict[str, Any] = field(default_factory=dict)
    confidence: float | None = None
    source: str = "rule"


CheckFn = Callable[[CheckContext], CheckResult]
REGISTRY: dict[str, CheckFn] = {}


def register(key: str):
    def deco(fn: CheckFn) -> CheckFn:
        REGISTRY[key] = fn
        return fn
    return deco


def ok(reason: str, **evidence) -> CheckResult:
    return CheckResult("pass", reason, evidence, 1.0)


def fail(reason: str, **evidence) -> CheckResult:
    return CheckResult("fail", reason, evidence, 1.0)


def human(reason: str, **evidence) -> CheckResult:
    return CheckResult("needs_human", reason, evidence, None)
