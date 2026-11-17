"""Request bodies for the API."""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel

Status = Literal["pass", "fail", "needs_human", "not_applicable"]
Priority = Literal["low", "medium", "high"]


class RetailerIn(BaseModel):
    name: str
    base_url: str
    search_url: Optional[str] = None
    product_link_pattern: Optional[str] = None
    brand_page_url: Optional[str] = None
    access_note: Optional[str] = None
    active: bool = True


class RetailerPatch(BaseModel):
    name: Optional[str] = None
    base_url: Optional[str] = None
    search_url: Optional[str] = None
    product_link_pattern: Optional[str] = None
    brand_page_url: Optional[str] = None
    access_note: Optional[str] = None
    active: Optional[bool] = None


class ProductUrlIn(BaseModel):
    url: str
    product_id: Optional[int] = None
    model: Optional[str] = None  # alternative to product_id


class CriterionIn(BaseModel):
    code: str
    block: Literal["visibility", "services", "advice", "ai_readiness"]
    section: str
    title: str
    description: Optional[str] = None
    lpr_ref: Optional[str] = None
    sk_levels: str = "1,2,3"
    page_type: Literal["product", "brand", "shop"] = "product"
    method: Literal["rule", "ai", "manual"] = "ai"
    rule_key: Optional[str] = None
    ai_prompt: Optional[str] = None
    priority: Priority = "medium"
    return_risk: bool = False
    escalate: bool = False
    fix_hint: Optional[str] = None
    active: bool = True


class CriterionPatch(BaseModel):
    block: Optional[Literal["visibility", "services", "advice", "ai_readiness"]] = None
    section: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    sk_levels: Optional[str] = None
    method: Optional[Literal["rule", "ai", "manual"]] = None
    rule_key: Optional[str] = None
    ai_prompt: Optional[str] = None
    priority: Optional[Priority] = None
    return_risk: Optional[bool] = None
    escalate: Optional[bool] = None
    page_type: Optional[Literal["product", "brand", "shop"]] = None
    fix_hint: Optional[str] = None
    active: Optional[bool] = None


class AuditIn(BaseModel):
    retailer_ids: Optional[list[int]] = None  # None = all active retailers
    criterion_codes: Optional[list[str]] = None  # None = all active criteria
    product_ids: Optional[list[int]] = None  # None = automatic sample per SK
    include_listing: bool = False  # the listing count takes a few minutes per retailer
    started_by: Optional[str] = None


class VerdictPatch(BaseModel):
    override_status: Optional[Status] = None
    clear_override: bool = False
    override_by: Optional[str] = None
    override_comment: Optional[str] = None
    suggested_fix: Optional[str] = None
    due_date: Optional[str] = None  # YYYY-MM-DD


class FeedbackIn(BaseModel):
    author: Optional[str] = None
    comment: str
    corrected_status: Optional[Status] = None


class ScheduleIn(BaseModel):
    enabled: bool
    interval_days: float = 7


class AuditDefaultsIn(BaseModel):
    samples_per_sk: int = 2
    due_days: int = 30


class SimulateIn(BaseModel):
    retailer_id: int
    question: str
    product_id: Optional[int] = None


class ProductIn(BaseModel):
    model: str
    ean: Optional[str] = None
    sk: Optional[str] = None
    series: Optional[str] = None
    uvp_eur: Optional[float] = None
    height_mm: Optional[float] = None
    width_mm: Optional[float] = None
    depth_mm: Optional[float] = None
    energy_class: Optional[str] = None
    noise_db: Optional[float] = None
    door_hinge: Optional[str] = None
    handle: Optional[str] = None
    active: bool = True


class ProductPatch(BaseModel):
    model: Optional[str] = None
    ean: Optional[str] = None
    sk: Optional[str] = None
    series: Optional[str] = None
    uvp_eur: Optional[float] = None
    height_mm: Optional[float] = None
    width_mm: Optional[float] = None
    depth_mm: Optional[float] = None
    energy_class: Optional[str] = None
    noise_db: Optional[float] = None
    door_hinge: Optional[str] = None
    handle: Optional[str] = None
    active: Optional[bool] = None


class AISettingsIn(BaseModel):
    provider: Literal["gemini", "claude", "none"]
    model: Optional[str] = None
    api_key: Optional[str] = None  # only sent when changed; stored in app/.env, never returned


class FixedIn(BaseModel):
    by: Optional[str] = None
