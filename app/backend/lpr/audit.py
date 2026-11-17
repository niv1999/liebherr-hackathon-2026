"""The audit agent: Plan -> Delegate/Check -> Review -> Report, for one retailer per run."""
from __future__ import annotations

import logging
import re
import traceback
from datetime import date, timedelta

from sqlmodel import Session, select

from . import settings
from .engine import check_page
from .crawler import Crawler, FetchResult, raw_fetch, robots_txt
from .db import session_scope
from .extract import extract, model_core, model_slug, norm
from .models import (AppSetting, AuditRun, Criterion, Feedback, ListingCheck, Notification, PageSnapshot, Product,
                     Retailer, RetailerProductUrl, Verdict, now)
from .scoring import score

log = logging.getLogger("lpr.audit")


# ------------------------------------------------------------------ helpers
def _progress(s: Session, run: AuditRun, msg: str) -> None:
    run.progress = msg
    s.add(run)
    s.commit()
    log.info("run %s: %s", run.id, msg)


def find_product_link(fetch: FetchResult, pattern: str | None, model: str) -> str | None:
    """Pick the search-result link that is the product page of exactly this model."""
    slug, core = model_slug(model), model_core(model).replace(" ", "-")
    rx = re.compile(pattern) if pattern else None
    candidates = []
    for href in fetch.links:
        clean = href.split("#")[0]
        if rx and not rx.match(clean):
            continue
        low = clean.lower()
        if slug in low:
            candidates.append((0, clean.split("?")[0]))
        elif core in low and re.search(re.escape(core) + r"(?![a-z0-9])", low):
            candidates.append((1, clean.split("?")[0]))
    return sorted(candidates)[0][1] if candidates else None


def _feedback_examples(s: Session, criterion_id: int) -> list[dict]:
    rows = s.exec(select(Feedback, Verdict).where(Feedback.criterion_id == criterion_id)
                  .where(Feedback.verdict_id == Verdict.id).order_by(Feedback.created_at.desc())
                  .limit(settings.FEEDBACK_EXAMPLES_IN_PROMPT)).all()
    return [{"comment": f.comment, "corrected_status": f.corrected_status, "ai_status": v.status} for f, v in rows]


def _availability(page: dict) -> bool | None:
    offer = page.get("jsonld_offer") or {}
    a = str(offer.get("availability") or "").lower()
    if a:
        return "instock" in a or "limitedavailability" in a or "preorder" in a
    t = (page.get("text") or "").lower()
    if re.search(r"nicht (mehr )?(lieferbar|verfügbar)|ausverkauft", t):
        return False
    if re.search(r"sofort lieferbar|auf lager|lieferbar|in den warenkorb", t):
        return True
    return None


# ------------------------------------------------------------------ main entry
def run_audit(run_id: int) -> None:
    with session_scope() as s:
        run = s.get(AuditRun, run_id)
        if not run:
            return
        run.status, run.started_at = "running", now()
        s.add(run)
        s.commit()
        try:
            _execute(s, run)
            run.status, run.error = "done", None
        except Exception as e:  # keep the error visible in the UI
            log.exception("run %s failed", run_id)
            run.status = "failed"
            run.error = f"{type(e).__name__}: {e}\n{traceback.format_exc()[-1500:]}"
        run.finished_at = now()
        s.add(run)
        s.commit()
        _notify(s, run)


def _execute(s: Session, run: AuditRun) -> None:
    retailer = s.get(Retailer, run.retailer_id)
    criteria = [c for c in s.exec(select(Criterion).where(Criterion.active == True)).all()  # noqa: E712
                if not run.criterion_codes or c.code in run.criterion_codes]
    products = [p for p in s.exec(select(Product)).all() if p.active]
    defaults = (s.get(AppSetting, "audit_defaults") or AppSetting(key="x", value={})).value
    per_sk = int(defaults.get("samples_per_sk", settings.SAMPLES_PER_SK))
    due = (date.today() + timedelta(days=int(defaults.get("due_days", 30)))).isoformat()
    out_dir = settings.ARTIFACTS_DIR / f"run_{run.id}"

    if not retailer.search_url:
        run.blocked = True
        _progress(s, run, f"No shop URL configured. {retailer.access_note or ''}".strip())
        return

    with Crawler(out_dir) as crawler:
        # ---- 1. PLAN: which product pages to audit -------------------------------------------
        _progress(s, run, "Planning: choosing products per assortment class")
        manual = {u.product_id: u for u in s.exec(select(RetailerProductUrl).where(
            RetailerProductUrl.retailer_id == retailer.id)).all()}
        by_id = {p.id: p for p in products}
        if run.product_ids:
            wanted = [by_id[i] for i in run.product_ids if i in by_id]
            plan_groups = {"selected": wanted}
            need = {"selected": len(wanted)}
        else:
            plan_groups = {sk: [p for p in products if p.sk == sk] for sk in ("1", "2", "3")}
            need = {sk: per_sk for sk in plan_groups}
        # hand-picked URLs first, then the rest
        for k in plan_groups:
            plan_groups[k].sort(key=lambda p: (manual.get(p.id) is None or manual[p.id].source != "manual", p.model))

        targets: list[tuple[Product, str]] = []
        search_failures = 0
        for k, group in plan_groups.items():
            found = 0
            for p in group:
                if found >= need[k]:
                    break
                url = manual[p.id].url if p.id in manual else None
                if not url:
                    _progress(s, run, f"Searching {retailer.name} for {p.model}")
                    res = crawler.search(retailer.search_url, p.model, f"search_{model_slug(p.model)}")
                    if res.blocked:
                        search_failures += 1
                        if search_failures >= 2 and not targets:
                            run.blocked = True
                            _progress(s, run, f"Blocked: {res.block_reason}. Needs manual assessment.")
                            return
                        continue
                    url = find_product_link(res, retailer.product_link_pattern, p.model)
                    if url:
                        s.add(RetailerProductUrl(retailer_id=retailer.id, product_id=p.id, url=url, source="search"))
                        s.commit()
                        manual[p.id] = RetailerProductUrl(retailer_id=retailer.id, product_id=p.id, url=url)
                if url:
                    targets.append((p, url))
                    found += 1

        robots = robots_txt(retailer.base_url)

        def save_verdicts(checked, product_id, snap):
            for c, r in checked:
                pid = product_id if c.page_type == "product" else None  # shop/brand verdicts belong to the retailer
                s.add(Verdict(run_id=run.id, criterion_id=c.id, product_id=pid, page_id=snap.id if snap else None,
                              status=r.status, source=r.source if c.method != "manual" else "manual",
                              confidence=r.confidence, reasoning=r.reasoning, evidence=r.evidence,
                              screenshot_path=snap.screenshot_path if snap else None,
                              suggested_fix=c.fix_hint if r.status == "fail" else None,
                              due_date=due if r.status == "fail" else None))
            s.commit()

        def snapshot(res, url, page, page_type, product_id=None, raw_status=None):
            snap = PageSnapshot(run_id=run.id, product_id=product_id, page_type=page_type, url=url,
                                final_url=res.final_url, status_code=res.status, blocked=res.blocked,
                                html_path=res.html_path, screenshot_path=res.screenshot_path,
                                fullpage_path=res.fullpage_path,
                                extracted={k: v for k, v in page.items() if k not in ("jsonld_product", "links")} |
                                {"jsonld_product_present": page.get("jsonld_product") is not None,
                                 "image_info": res.image_info[:80], "raw_status": raw_status,
                                 "block_reason": res.block_reason})
            s.add(snap)
            s.commit()
            return snap

        # Shop-wide facts: how the shop search treats Liebherr (criteria VIS-01 / VIS-02)
        shop_search = {}
        if any(c.rule_key in ("shop_search_brand", "shop_search_category") for c in criteria):
            _progress(s, run, "Testing the shop search")
            shop_search = _shop_search(crawler, retailer)

        # ---- 2+3. DELEGATE & CHECK: product pages (shop-wide criteria only once, on the first page) ---
        feedback_fn = lambda cid: _feedback_examples(s, cid)  # noqa: E731
        for i, (p, url) in enumerate(targets, 1):
            _progress(s, run, f"Checking product {i}/{len(targets)}: {p.model}")
            res = crawler.fetch(url, f"pdp_{model_slug(p.model)}")
            raw_status, raw_html = raw_fetch(url)
            page = extract(res.html, res.final_url or url)
            page["shop_search"] = shop_search
            page["links"] = res.links
            page["load_ms"] = res.load_ms
            page["retailer_name"] = retailer.name
            raw_page = extract(raw_html, url) if raw_html else None
            snap = snapshot(res, url, page, "product", p.id, raw_status)
            types = ("product", "shop") if i == 1 else ("product",)
            checked = check_page(s, retailer, criteria, p, page, raw_page, raw_status, robots, res.image_info,
                                 res.screenshot_path, res.block_reason if res.blocked else None, feedback_fn,
                                 page_types=types, fullpage_path=res.fullpage_path)
            save_verdicts(checked, p.id, snap)

        # ---- brand page (the Liebherr shop-in-shop) ---------------------------------------------
        if any(c.page_type == "brand" for c in criteria):
            brand_url = retailer.brand_page_url or _find_brand_link(s, run)
            run.brand_page_url = brand_url
            if brand_url:
                _progress(s, run, "Checking the Liebherr brand page")
                res = crawler.fetch(brand_url, "brand_page")
                page = extract(res.html, res.final_url or brand_url)
                page["links"] = res.links
                page["final_url"] = res.final_url
                sub = _technology_subpage(res.links, res.final_url or brand_url)
                if sub:  # e.g. MediaMarkt keeps Liebherr technologies on a "Technik" subpage
                    _progress(s, run, "Checking the brand page's technology subpage")
                    sres = crawler.fetch(sub, "brand_technology", screenshots=False)
                    if not sres.blocked:
                        page["subpage_url"] = sub
                        page["subpage_text"] = extract(sres.html, sub).get("content_text", "")
                snap = snapshot(res, brand_url, page, "brand")
                checked = check_page(s, retailer, criteria, None, page, None, None, robots, res.image_info,
                                     res.screenshot_path, res.block_reason if res.blocked else None, feedback_fn,
                                     page_types=("brand",), fullpage_path=res.fullpage_path)
                save_verdicts(checked, None, snap)
            else:
                from .checks import CheckResult
                save_verdicts([(c, CheckResult("fail", "No Liebherr brand page found in this shop."))
                               for c in criteria if c.page_type == "brand" and c.rule_key == "brand_exists"], None, None)

        # ---- listing pass: how many reference models are listed / available -------------------
        if run.include_listing and not run.product_ids:
            _listing_pass(s, run, retailer, crawler, products, manual)

    # ---- 4. REVIEW: verdicts the AI was unsure about are already 'needs_human'. ------------------
    # ---- 5. REPORT: score -------------------------------------------------------------------------
    _progress(s, run, "Scoring")
    verdicts = s.exec(select(Verdict).where(Verdict.run_id == run.id)).all()
    all_criteria = {c.id: c for c in s.exec(select(Criterion)).all()}
    sk_of = {p.id: p.sk for p in products}
    result = score(verdicts, all_criteria, sk_of)
    for k, v in result.items():
        setattr(run, k, v)
    if not targets:
        run.progress = "No product pages found at this retailer."
    else:
        run.progress = f"Done: {len(targets)} product pages, {result['checked_count']} of {result['applicable_count']} checks decided automatically."
    s.add(run)
    s.commit()


def _top_product_links(res: FetchResult, pattern: str | None, n: int = 5) -> list[str]:
    rx = re.compile(pattern) if pattern else None
    out = []
    for href in res.links:
        h = href.split("#")[0].split("?")[0]
        if rx and rx.match(h) and h not in out:
            out.append(h)
        if len(out) >= n:
            break
    return out


def _is_liebherr_link(url: str, liebherr_models: set[str]) -> bool:
    low = url.lower()
    return "liebherr" in low or any(m in low for m in liebherr_models)


def _shop_search(crawler: Crawler, retailer: Retailer) -> dict:
    from .db import session_scope as _ss
    with _ss() as s2:
        models = {model_slug(p.model) for p in s2.exec(select(Product)).all()}
        models |= {model_core(m).replace(" ", "-") for m in models}
    out = {}
    for key, query in (("brand", "Liebherr"), ("category", "Kühl-Gefrierkombination")):
        res = crawler.search(retailer.search_url, query, f"shopsearch_{key}")
        if res.blocked:
            out[key] = {"blocked": res.block_reason}
            continue
        top = _top_product_links(res, retailer.product_link_pattern)
        landed = bool(res.final_url and re.search(r"liebherr", res.final_url, re.I) and "search" not in res.final_url.lower()
                      and "suche" not in res.final_url.lower())
        out[key] = {"query": query, "final_url": res.final_url, "landed_on_brand_page": landed, "top5": top,
                    "liebherr_products_top5": sum(_is_liebherr_link(u, models) for u in top)}
    return out


def _technology_subpage(links: list[str], brand_url: str) -> str | None:
    from urllib.parse import urlparse
    host = urlparse(brand_url).netloc
    for href in links:
        h = href.split("#")[0]
        if urlparse(h).netloc == host and re.search(r"technik|technolog|innovation", h, re.I)                 and re.search(r"liebherr", h, re.I) and h.rstrip("/") != brand_url.rstrip("/"):
            return h
    return None


def _find_brand_link(s: Session, run: AuditRun) -> str | None:
    """Look for a 'Liebherr Markenwelt' link on the product pages we already fetched."""
    for snap in s.exec(select(PageSnapshot).where(PageSnapshot.run_id == run.id)).all():
        if not snap.html_path:
            continue
        from pathlib import Path
        html = Path(snap.html_path).read_text(encoding="utf-8")
        m = re.search(r'href="([^"]*(?:markenwelt[^"]*liebherr|marken/liebherr|brand/liebherr|/liebherr/?))"', html, re.I)
        if m:
            from urllib.parse import urljoin
            return urljoin(snap.url, m.group(1))
    return None


def _fast_search(retailer: Retailer, model: str) -> str | None:
    """Shop search via plain HTTP; returns the product URL if the result page lists it, else None."""
    from urllib.parse import quote_plus, urljoin

    status, html = raw_fetch(retailer.search_url.replace("{query}", quote_plus(model)), timeout=15)
    if status != 200 or not html:
        return None
    links = [urljoin(retailer.base_url, h) for h in re.findall(r'href="([^"]+)"', html)]
    return find_product_link(FetchResult(url="", links=links), retailer.product_link_pattern, model)


def _listing_pass(s: Session, run: AuditRun, retailer: Retailer, crawler: Crawler, products: list[Product],
                  known: dict) -> None:
    ref = [p for p in products if p.sk in ("1", "2", "3", "frei")]
    listed = available = unknown = 0
    for i, p in enumerate(ref, 1):
        _progress(s, run, f"Counting listed products {i}/{len(ref)}")
        url = known[p.id].url if p.id in known else None
        if not url:
            url = _fast_search(retailer, p.model)  # plain HTTP first (fast), real browser only if needed
            if url is None:
                res = crawler.search(retailer.search_url, p.model, f"list_{model_slug(p.model)}")
                url = None if res.blocked else find_product_link(res, retailer.product_link_pattern, p.model)
        avail = None
        if url:
            listed += 1
            status, html = raw_fetch(url)
            if html and status == 200:
                avail = _availability(extract(html, url))
            if avail is None:  # plain request blocked (e.g. Cloudflare): read the page in the real browser
                res = crawler.fetch(url, f"avail_{model_slug(p.model)}", screenshots=False)
                if not res.blocked:
                    avail = _availability(extract(res.html, url))
            available += 1 if avail else 0
            unknown += 1 if avail is None else 0
        s.add(ListingCheck(run_id=run.id, product_id=p.id, listed=bool(url), available=avail, url=url))
    s.commit()
    run.reference_count, run.listed_count = len(ref), listed
    run.available_count = None if listed and unknown > listed / 2 else available  # None = could not be read
    _availability_verdict(s, run)


def _availability_verdict(s: Session, run: AuditRun) -> None:
    """LPR #68: enough Liebherr models per SK class are available to buy (Liebherr: 10 per SK, retailer's choice)."""
    from .models import Verdict as V
    crit = s.exec(select(Criterion).where(Criterion.rule_key == "available_per_sk", Criterion.active == True)).first()  # noqa: E712
    if not crit:
        return
    target = 10
    prods = {p.id: p for p in s.exec(select(Product)).all()}
    per_sk: dict[str, int] = {}
    totals: dict[str, int] = {}
    for c in s.exec(select(ListingCheck).where(ListingCheck.run_id == run.id)).all():
        sk = prods[c.product_id].sk
        totals[sk] = totals.get(sk, 0) + 1
        per_sk[sk] = per_sk.get(sk, 0) + (1 if c.available else 0)
    checks = s.exec(select(ListingCheck).where(ListingCheck.run_id == run.id)).all()
    listed_n = sum(c.listed for c in checks)
    unknown_n = sum(c.listed and c.available is None for c in checks)
    if listed_n and unknown_n > listed_n / 2:
        s.add(V(run_id=run.id, criterion_id=crit.id, status="needs_human", source="rule",
                reasoning=f"Availability could not be read for {unknown_n} of {listed_n} listed models (the shop blocks it).",
                evidence={"listed": listed_n, "unknown": unknown_n}))
        s.commit()
        return
    short = [f"SK{sk}: {per_sk.get(sk, 0)} of {min(target, totals.get(sk, 0))}" for sk in ("1", "2", "3")
             if per_sk.get(sk, 0) < min(target, totals.get(sk, 0))]
    ok = not short
    reason = (f"Enough Liebherr models are available in every SK class (target {target} per class, "
              "or all reference models where fewer exist)." if ok else
              f"Too few Liebherr models available: {', '.join(short)}.")
    s.add(V(run_id=run.id, criterion_id=crit.id, status="pass" if ok else "fail", source="rule", confidence=1.0,
            reasoning=reason, evidence={"available_per_sk": per_sk, "reference_per_sk": totals, "target": target},
            suggested_fix=None if ok else crit.fix_hint))
    s.commit()


def _notify(s: Session, run: AuditRun) -> None:
    retailer = s.get(Retailer, run.retailer_id)
    prev = s.exec(select(AuditRun).where(AuditRun.retailer_id == run.retailer_id, AuditRun.status == "done",
                                         AuditRun.id != run.id).order_by(AuditRun.id.desc())).first()
    if run.status == "failed":
        s.add(Notification(run_id=run.id, kind="audit_failed", title=f"Audit failed: {retailer.name}",
                           body=(run.error or "")[:300]))
    elif run.blocked:
        s.add(Notification(run_id=run.id, title=f"{retailer.name}: blocked for automated checks",
                           body=run.progress or "Needs manual assessment."))
    else:
        change = ""
        if prev and prev.lpr_score is not None and run.lpr_score is not None:
            d = round(run.lpr_score - prev.lpr_score, 1)
            change = f" ({'+' if d >= 0 else ''}{d} vs. last audit)"
        fails = len(s.exec(select(Verdict).where(Verdict.run_id == run.id, Verdict.status == "fail")).all())
        s.add(Notification(run_id=run.id, title=f"Audit finished: {retailer.name}",
                           body=f"LPR score {run.lpr_score}%{change}, AI-readiness {run.ai_readiness_score}%, "
                                f"{fails} failed checks, {run.return_risk_count} return risks."))
    s.commit()
