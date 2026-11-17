"""Database tables.

Overview:
  Retailer ─┬─ RetailerProductUrl (hand-picked or found product page per model)
            └─ AuditRun ─┬─ PageSnapshot (one fetched page: html + screenshot paths)
                         ├─ Verdict ── Feedback (human correction on an AI verdict)
                         └─ ListingCheck (is a reference model listed / available?)
  Product   = Liebherr reference data (master data) per model
  Criterion = one LPR (or AI-readiness) criterion, editable in the UI
  Notification, AppSetting = alerts and key/value settings (schedule …)
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


def now() -> datetime:
    return datetime.now(timezone.utc)


class Retailer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    base_url: str
    # How to find products: a search URL with {query}, and a regex product links must match.
    search_url: Optional[str] = None
    product_link_pattern: Optional[str] = None
    brand_page_url: Optional[str] = None  # the Liebherr brand page ("Markenwelt") in this shop
    active: bool = True
    # Set when the shop blocks automated access; shown as "needs manual assessment".
    access_note: Optional[str] = None
    created_at: datetime = Field(default_factory=now)


class Product(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    model: str = Field(index=True, unique=True)  # e.g. "CBNsda 5223-22"
    article_no: Optional[str] = None
    ean: Optional[str] = Field(default=None, index=True)
    sk: Optional[str] = None  # "1" | "2" | "3" | "frei"
    category: str = "fridge_freezer_freestanding"
    series: Optional[str] = None
    uvp_eur: Optional[float] = None
    height_mm: Optional[float] = None
    width_mm: Optional[float] = None
    depth_mm: Optional[float] = None
    energy_class: Optional[str] = None
    noise_db: Optional[float] = None
    door_hinge: Optional[str] = None
    handle: Optional[str] = None
    active: bool = True  # inactive models are not audited
    data: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))  # features, images, docs, attributes


class Criterion(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(index=True, unique=True)  # e.g. "PDP-04"
    block: str  # visibility | services | advice | ai_readiness
    section: str  # e.g. "Product detail page"
    title: str
    description: Optional[str] = None
    lpr_ref: Optional[str] = None  # original LPR criterion wording / number
    sk_levels: str = "1,2,3"  # which assortment classes it applies to
    page_type: str = "product"  # product | brand | shop
    method: str = "rule"  # rule | ai | manual
    rule_key: Optional[str] = None  # name of the rule / AI check implementation
    ai_prompt: Optional[str] = None  # editable instruction for AI-judged criteria
    priority: str = "medium"  # low | medium | high  -> weight
    return_risk: bool = False
    escalate: bool = False  # if the rule fails ("not found in text"), the vision judge double-checks the full page
    fix_hint: Optional[str] = None  # default suggested fix shown to retailers
    active: bool = True
    updated_at: datetime = Field(default_factory=now)

    def applies_to_sk(self, sk: Optional[str]) -> bool:
        if not sk or sk not in {"1", "2", "3"}:
            return "1" in self.sk_levels.split(",")
        return sk in self.sk_levels.split(",")


class RetailerProductUrl(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    retailer_id: int = Field(foreign_key="retailer.id", index=True)
    product_id: int = Field(foreign_key="product.id", index=True)
    url: str
    source: str = "search"  # search | manual
    created_at: datetime = Field(default_factory=now)


class AuditRun(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    retailer_id: int = Field(foreign_key="retailer.id", index=True)
    trigger: str = "manual"  # manual | scheduled
    started_by: Optional[str] = None
    status: str = "queued"  # queued | running | done | failed
    progress: Optional[str] = None
    # Optional restriction of the run (None = everything)
    criterion_codes: Optional[list[str]] = Field(default=None, sa_column=Column(JSON))
    product_ids: Optional[list[int]] = Field(default=None, sa_column=Column(JSON))
    include_listing: bool = True
    created_at: datetime = Field(default_factory=now)
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    # Results (filled by scoring)
    blocked: bool = False
    lpr_score: Optional[float] = None  # 0..100
    ai_readiness_score: Optional[float] = None  # 0..100
    checked_count: int = 0
    applicable_count: int = 0
    return_risk_count: int = 0
    reference_count: Optional[int] = None
    listed_count: Optional[int] = None
    available_count: Optional[int] = None
    block_scores: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    sk_scores: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))  # LPR score per SK class
    brand_page_url: Optional[str] = None
    error: Optional[str] = None


class PageSnapshot(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    run_id: int = Field(foreign_key="auditrun.id", index=True)
    product_id: Optional[int] = Field(default=None, foreign_key="product.id")
    page_type: str = "product"
    url: str
    final_url: Optional[str] = None
    status_code: Optional[int] = None
    blocked: bool = False
    html_path: Optional[str] = None
    raw_html_path: Optional[str] = None  # plain HTTP (no JavaScript) version, for AI-readiness
    screenshot_path: Optional[str] = None  # first screen
    fullpage_path: Optional[str] = None
    extracted: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    fetched_at: datetime = Field(default_factory=now)


class Verdict(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    run_id: int = Field(foreign_key="auditrun.id", index=True)
    criterion_id: int = Field(foreign_key="criterion.id", index=True)
    product_id: Optional[int] = Field(default=None, foreign_key="product.id")
    page_id: Optional[int] = Field(default=None, foreign_key="pagesnapshot.id")
    status: str  # pass | fail | needs_human | not_applicable | error
    source: str = "rule"  # rule | ai | manual
    confidence: Optional[float] = None
    reasoning: Optional[str] = None
    evidence: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    screenshot_path: Optional[str] = None
    # Human override
    override_status: Optional[str] = None
    override_by: Optional[str] = None
    override_comment: Optional[str] = None
    override_at: Optional[datetime] = None
    # Retailer communication
    suggested_fix: Optional[str] = None
    due_date: Optional[str] = None  # ISO date
    created_at: datetime = Field(default_factory=now)

    @property
    def effective_status(self) -> str:
        return self.override_status or self.status


class Feedback(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    verdict_id: int = Field(foreign_key="verdict.id", index=True)
    criterion_id: int = Field(foreign_key="criterion.id", index=True)
    author: Optional[str] = None
    comment: str
    corrected_status: Optional[str] = None
    created_at: datetime = Field(default_factory=now)


class ListingCheck(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    run_id: int = Field(foreign_key="auditrun.id", index=True)
    product_id: int = Field(foreign_key="product.id")
    listed: bool = False
    available: Optional[bool] = None
    url: Optional[str] = None


class Notification(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    run_id: Optional[int] = Field(default=None, foreign_key="auditrun.id")
    kind: str = "audit_finished"  # audit_finished | audit_failed
    title: str
    body: str
    read: bool = False
    created_at: datetime = Field(default_factory=now)


class AppSetting(SQLModel, table=True):
    key: str = Field(primary_key=True)
    value: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))


class AIConnection(SQLModel, table=True):
    """A saved AI provider connection (API key). One of them is active (AppSetting 'ai_active')."""
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    provider: str  # gemini | claude
    model: str
    api_key: str
    created_at: datetime = Field(default_factory=now)
