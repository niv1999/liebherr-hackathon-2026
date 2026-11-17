"""Rule-based (deterministic) checks. Each function returns pass / fail / needs_human with evidence.

The pages are German, so keyword lists are German.
"""
from __future__ import annotations

import re

from ..extract import model_core, norm
from .base import CheckContext, CheckResult, fail, human, ok, register


# ------------------------------------------------------------ helpers
def _text(ctx: CheckContext) -> str:
    return (ctx.page.get("text") or "").lower()


def _names(ctx: CheckContext) -> list[str]:
    p = ctx.page
    jl = p.get("jsonld_product") or {}
    return [x for x in (p.get("h1"), jl.get("name"), p.get("og_title"), p.get("title")) if x]


def _snippet(text: str, needle: str, width: int = 80) -> str | None:
    i = text.lower().find(needle.lower())
    if i < 0:
        return None
    return text[max(0, i - width): i + len(needle) + width].strip()


def _found(text: str, words: list[str]) -> list[str]:
    return [w for w in words if re.search(w, text, re.I)]


def _feature_titles(ctx: CheckContext) -> list[str]:
    data = (ctx.product.data if ctx.product else {}) or {}
    titles = [f["title"] for f in (data.get("key_features") or []) + (data.get("features") or []) if f.get("title")]
    seen, out = set(), []
    for t in titles:
        if t.lower() not in seen:
            seen.add(t.lower())
            out.append(t)
    return out


def _features_in(text: str, titles: list[str]) -> list[str]:
    hits = []
    for t in titles:
        variants = {t.lower(), t.lower().replace("-", " "), t.lower().replace(" ", "")}
        if any(v and v in text for v in variants):
            hits.append(t)
    return hits


def _numbers_mm(text: str) -> list[float]:
    """All numbers in the text, interpreted both as cm and as mm (returned in mm)."""
    out = []
    for m in re.finditer(r"(?<![\d.,])(\d{2,4}(?:[.,]\d)?)(?![\d])", text):
        v = float(m.group(1).replace(",", "."))
        out.extend([v, v * 10])
    return out


def _dims_found(text: str, product) -> dict[str, bool]:
    nums = _numbers_mm(text)
    res = {}
    for label, val in (("height", product.height_mm), ("width", product.width_mm), ("depth", product.depth_mm)):
        res[label] = bool(val) and any(abs(n - val) <= 6 for n in nums)
    return res


# ------------------------------------------------------------ product detail page
@register("name_has_brand")
def name_has_brand(ctx: CheckContext) -> CheckResult:
    names = _names(ctx)
    hit = next((n for n in names if "liebherr" in n.lower()), None)
    if hit:
        return ok("The product name contains 'Liebherr'.", product_name=hit)
    return fail("'Liebherr' is missing from the product name.", product_names=names[:3])


@register("name_has_model")
def name_has_model(ctx: CheckContext) -> CheckResult:
    model = ctx.product.model
    names = _names(ctx)
    full = next((n for n in names if norm(model) in norm(n)), None)
    if full:
        return ok(f"The product name contains the full model name '{model}'.", product_name=full)
    core = next((n for n in names if model_core(model) in norm(n)), None)
    if core:
        return fail(f"The model name is there but without the index (expected '{model}').", product_name=core)
    return fail(f"The model name '{model}' is not in the product name.", product_names=names[:3])


@register("ean_matches")
def ean_matches(ctx: CheckContext) -> CheckResult:
    expected = (ctx.product.ean or "").strip()
    found = sorted(set(ctx.page.get("jsonld_gtins", []) + ctx.page.get("eans_in_html", [])))
    found_norm = {f.lstrip("0") for f in found}
    if expected and expected.lstrip("0") in found_norm:
        return ok("The EAN on the page matches Liebherr's master data.", expected=expected, found=found)
    if found:
        return fail("The page shows a different EAN than Liebherr's master data.", expected=expected, found=found)
    return human("No EAN found on the page, so it could not be compared.", expected=expected)


@register("key_features_count")
def key_features_count(ctx: CheckContext) -> CheckResult:
    titles = _feature_titles(ctx)
    hits = _features_in(_text(ctx), titles)
    ev = {"found": hits, "official_features": titles, "count": len(hits)}
    if len(hits) >= 5:
        return ok(f"{len(hits)} official Liebherr features are named on the page (at least 5 required).", **ev)
    return fail(f"Only {len(hits)} of the official Liebherr features are named on the page (at least 5 required).", **ev)


@register("energy_label_and_sheet")
def energy_label_and_sheet(ctx: CheckContext) -> CheckResult:
    t = _text(ctx)
    label = _found(t, [r"energieeffizienzklasse", r"energielabel", r"energie-label", r"effizienzklasse"])
    sheet = _found(t, [r"produktdatenblatt", r"datenblatt", r"eprel"])
    ev = {"energy_label_terms": label, "data_sheet_terms": sheet}
    if label and sheet:
        return ok("Energy label and product data sheet are referenced on the page.", **ev)
    missing = [n for n, v in (("energy label", label), ("data sheet", sheet)) if not v]
    return fail(f"Missing on the page: {', '.join(missing)}.", **ev)


@register("manual_available")
def manual_available(ctx: CheckContext) -> CheckResult:
    t = _text(ctx)
    terms = _found(t, [r"bedienungsanleitung", r"gebrauchsanweisung", r"gebrauchsanleitung", r"montageanleitung"])
    pdfs = ctx.page.get("pdf_links", [])
    if terms or pdfs:
        return ok("Operating instructions / documents are offered.", terms=terms, pdf_links=pdfs[:5])
    return fail("No operating manual or document link found.")


@register("shipping_costs")
def shipping_costs(ctx: CheckContext) -> CheckResult:
    t = _text(ctx)
    m = re.search(r"(versand|lieferung|lieferkosten|liefergebühr|versandkosten)[^.]{0,60}(€|eur|kostenlos|gratis|frei)", t)
    if m:
        return ok("Shipping / delivery costs are stated.", quote=m.group(0)[:160])
    return fail("No shipping / delivery cost information found.")


@register("dimensions_text")
def dimensions_text(ctx: CheckContext) -> CheckResult:
    p = ctx.product
    t = _text(ctx)
    found = _dims_found(t, p)
    expected = {"height_mm": p.height_mm, "width_mm": p.width_mm, "depth_mm": p.depth_mm}
    has_words = bool(_found(t, [r"höhe", r"breite", r"tiefe", r"abmessung", r"maße"]))
    if all(found.values()) and has_words:
        return ok("Height, width and depth are written on the page and match Liebherr's data.", expected=expected, found=found)
    missing = [k for k, v in found.items() if not v]
    return fail(f"Dimensions missing or not matching Liebherr's data: {', '.join(missing) or 'labels'} "
                "(customers can't check if the appliance fits: return risk).", expected=expected, found=found)


@register("tech_data_complete")
def tech_data_complete(ctx: CheckContext) -> CheckResult:
    p = ctx.product
    t = _text(ctx)
    checks = {
        "energy class": bool(re.search(r"energieeffizienzklasse|effizienzklasse", t)),
        "noise level": bool(re.search(r"\d{2}\s?db|db\s?\(?a?\)?\s*:?\s*\d{2}", t))
        and ("geräusch" in t or "lautstärke" in t or "schall" in t),
        "volume": bool(re.search(r"\d{2,3}\s?(l|liter)\b", t)) and ("inhalt" in t or "volumen" in t or "nutzinhalt" in t),
    }
    missing = [k for k, v in checks.items() if not v]
    ev = {"present": checks, "expected_energy_class": p.energy_class, "expected_noise_db": p.noise_db}
    if not missing:
        return ok("Energy class, noise level and volume are given.", **ev)
    return fail(f"Technical data incomplete, missing: {', '.join(missing)}.", **ev)


@register("hinge_and_handle")
def hinge_and_handle(ctx: CheckContext) -> CheckResult:
    t = _text(ctx)
    hinge = _snippet(ctx.page.get("text") or "", "Türanschlag")
    handle = re.search(r"\bgriff(mulde|leiste|art|e)?\b|stangengriff|griffmulde", t)
    ev = {"hinge_quote": hinge, "handle_quote": handle.group(0) if handle else None,
          "official_hinge": ctx.product.door_hinge, "official_handle": ctx.product.handle}
    if hinge and handle:
        return ok("Door hinge and handle information are given.", **ev)
    missing = [n for n, v in (("door hinge", hinge), ("handle", handle)) if not v]
    return fail(f"Missing: {', '.join(missing)} (shoppers may buy the wrong model: return risk).", **ev)


@register("official_images")
def official_images(ctx: CheckContext) -> CheckResult:
    from ..images import match_official_images

    official = (ctx.product.data or {}).get("images") or []
    if not official:
        return human("No official images in the reference data for this model.")
    res = match_official_images(official, ctx.image_info)
    if res["page_images"] == 0:
        return human("No large product images could be read from the page.", **res)
    if res["matched"] >= 1:
        return ok(f"{res['matched']} of {res['page_images']} large page images match official Liebherr images.", **res)
    return fail("None of the large product images match the official Liebherr images.", **res)


@register("syndicated_content")
def syndicated_content(ctx: CheckContext) -> CheckResult:
    p = ctx.page
    tools = [n for n, k in (("Loadbee", "has_loadbee"), ("Cliplister", "has_cliplister"), ("DemoUp", "has_demoup")) if p.get(k)]
    if tools:
        return ok(f"Liebherr content is integrated via {', '.join(tools)}.", tools=tools)
    hits = _features_in(_text(ctx), _feature_titles(ctx))
    if len(hits) >= 5:
        return human("No content tool detected, but several Liebherr features are described; maybe integrated manually.",
                     features_found=hits)
    return fail("No Liebherr content integration (Loadbee, Cliplister, DemoUp) and little Liebherr content found.")


@register("videos_present")
def videos_present(ctx: CheckContext) -> CheckResult:
    p = ctx.page
    n = p.get("video_count", 0)
    if n or p.get("has_cliplister"):
        return ok("Product videos are present on the page.", video_elements=n, cliplister=p.get("has_cliplister"))
    return fail("No product videos found on the page.")


# ------------------------------------------------------------ advice
PHONE = re.compile(r"(?:\+49|0)[\s(]*\d{2,5}[)\s/\-]*\d{2,4}[\s\-]?\d{2,6}")


@register("phone_visible")
def phone_visible(ctx: CheckContext) -> CheckResult:
    text = ctx.page.get("text") or ""
    for m in re.finditer(r"hotline|beratung|telefon|anrufen|rufen sie|service-nummer|kundenservice", text, re.I):
        window = text[max(0, m.start() - 120): m.end() + 120]
        ph = PHONE.search(window)
        if ph:
            return ok("A phone number for advice is shown on the product page.", quote=window.strip()[:240])
    return fail("No phone number for advice found on the product page.")


# ------------------------------------------------------------ services
PAYMENT_TERMS = {
    "PayPal": r"paypal", "Klarna": r"klarna", "Credit card": r"kreditkarte|visa|mastercard|american express",
    "Invoice": r"rechnung|rechnungskauf", "Financing": r"finanzierung|ratenkauf|raten", "Giropay": r"giropay",
    "Apple Pay": r"apple pay", "Google Pay": r"google pay", "Prepayment": r"vorkasse|überweisung",
}


@register("payment_methods")
def payment_methods(ctx: CheckContext) -> CheckResult:
    src = ((ctx.page.get("text") or "") + " " + " ".join(i.get("alt", "") for i in ctx.image_info)).lower()
    found = [k for k, rx in PAYMENT_TERMS.items() if re.search(rx, src)]
    if len(found) >= 2:
        return ok(f"{len(found)} payment methods found.", methods=found)
    return fail(f"Only {len(found)} payment method(s) found on the product page.", methods=found)


@register("financing")
def financing(ctx: CheckContext) -> CheckResult:
    t = _text(ctx)
    found = _found(t, [r"finanzierung", r"ratenkauf", r"rechnungskauf", r"kauf auf rechnung", r"0\s?% finanzierung"])
    if found:
        return ok("Invoice or financing is offered.", terms=found)
    return fail("No invoice or financing option found.")


@register("delivery_services")
def delivery_services(ctx: CheckContext) -> CheckResult:
    t = _text(ctx)
    services = {
        "old appliance pickup": r"altgerät", "connection": r"anschluss|anschließen", "setup": r"aufstell|aufbau",
        "packaging removal": r"verpackungs(entsorgung|mitnahme)|verpackung entsorg|verpackung mitnehmen",
        "2-person delivery": r"2-mann|zwei-mann|2 mann|zwei mann", "delivery to the room": r"verwendungsstelle|bis in die wohnung",
    }
    found = [k for k, rx in services.items() if re.search(rx, t)]
    if len(found) >= 2:
        return ok(f"Delivery services offered: {', '.join(found)}.", services=found)
    return fail(f"Few delivery services found ({', '.join(found) or 'none'}).", services=found)


@register("availability_shown")
def availability_shown(ctx: CheckContext) -> CheckResult:
    offer = ctx.page.get("jsonld_offer") or {}
    t = _text(ctx)
    m = re.search(r"(sofort lieferbar|auf lager|lieferbar|verfügbar|lieferzeit[^.]{0,40}|nicht verfügbar|ausverkauft)", t)
    if offer.get("availability") or m:
        return ok("Availability / delivery time is shown.", structured=offer.get("availability"), quote=m.group(0) if m else None)
    return fail("No availability or delivery time found.")


# ------------------------------------------------------------ AI readiness
@register("air_jsonld_product")
def air_jsonld_product(ctx: CheckContext) -> CheckResult:
    prod = ctx.page.get("jsonld_product")
    if prod and prod.get("name"):
        return ok("The page has schema.org Product data that AI systems can read.", name=prod.get("name"),
                  fields=sorted(k for k in prod.keys() if not k.startswith("@"))[:20])
    return fail("No schema.org Product data (JSON-LD) found.", jsonld_types=ctx.page.get("jsonld_types"))


@register("air_jsonld_identifiers")
def air_jsonld_identifiers(ctx: CheckContext) -> CheckResult:
    gt = [g.lstrip("0") for g in ctx.page.get("jsonld_gtins", [])]
    brand = (ctx.page.get("jsonld_brand") or "")
    expected = (ctx.product.ean or "").lstrip("0")
    good_gtin = expected and expected in gt
    good_brand = "liebherr" in str(brand).lower()
    ev = {"gtins": ctx.page.get("jsonld_gtins"), "brand": brand, "expected_gtin": ctx.product.ean}
    if good_gtin and good_brand:
        return ok("Structured data contains the correct GTIN and brand Liebherr.", **ev)
    missing = [n for n, v in (("correct GTIN", good_gtin), ("brand", good_brand)) if not v]
    return fail(f"Structured data is missing: {', '.join(missing)}.", **ev)


@register("air_offer")
def air_offer(ctx: CheckContext) -> CheckResult:
    o = ctx.page.get("jsonld_offer") or {}
    if o.get("price") and o.get("availability"):
        return ok("Price and availability are machine-readable.", **o)
    return fail("Price and/or availability missing from the structured data.", offer=o)


@register("air_no_js_content")
def air_no_js_content(ctx: CheckContext) -> CheckResult:
    if ctx.raw_page is None or not ctx.raw_page.get("text"):
        return fail(f"The page returns no content without JavaScript (HTTP {ctx.raw_status}).", http_status=ctx.raw_status)
    t = (ctx.raw_page.get("text") or "").lower()
    has_model = model_core(ctx.product.model) in norm(t)
    dims = _dims_found(t, ctx.product)
    ev = {"http_status": ctx.raw_status, "model_in_plain_html": has_model, "dimensions_in_plain_html": dims,
          "plain_text_length": len(t)}
    if has_model and sum(dims.values()) >= 2:
        return ok("Model name and dimensions are in the plain HTML (readable without JavaScript).", **ev)
    return fail("Key product facts only appear after JavaScript runs, so many AI crawlers can't see them.", **ev)


AI_BOTS = ["OAI-SearchBot", "GPTBot", "ChatGPT-User", "PerplexityBot", "ClaudeBot", "Google-Extended"]


def _rule_matches(pattern: str, path: str) -> int:
    """Length of the match if the robots.txt pattern matches the path (supports * and $), else -1."""
    if not pattern:
        return -1
    rx = "^" + re.escape(pattern).replace(r"\*", ".*")
    if rx.endswith(r"\$"):
        rx = rx[:-2] + "$"
    return len(pattern) if re.match(rx, path) else -1


def _robots_blocks(robots: str, agent: str, path: str = "/") -> bool:
    """True if robots.txt disallows `path` for this agent (Google-style: longest match wins, Allow wins ties)."""
    groups, current, rules = [], [], []
    for line in robots.splitlines():
        line = line.split("#")[0].strip()
        if not line or ":" not in line:
            continue
        k, v = [x.strip() for x in line.split(":", 1)]
        k = k.lower()
        if k == "user-agent":
            if rules:
                groups.append((current, rules))
                current, rules = [], []
            current.append(v.lower())
        elif k in ("disallow", "allow"):
            rules.append((k, v))
    if current or rules:
        groups.append((current, rules))
    specific = [r for agents, r in groups if agent.lower() in agents]
    chosen = specific[0] if specific else next((r for agents, r in groups if "*" in agents), [])
    best_len, allowed = -1, True
    for k, v in chosen:
        n = _rule_matches(v, path)
        if n > best_len or (n == best_len and k == "allow"):
            best_len, allowed = n, (k == "allow")
    return not allowed


@register("air_robots")
def air_robots(ctx: CheckContext) -> CheckResult:
    if ctx.robots_txt is None:
        return human("robots.txt could not be read.")
    from urllib.parse import urlparse

    path = urlparse(ctx.page.get("url") or "/").path or "/"
    blocked = [a for a in AI_BOTS if _robots_blocks(ctx.robots_txt, a, path)]
    search_bots_ok = not any(b in blocked for b in ("OAI-SearchBot", "PerplexityBot"))
    if search_bots_ok:
        return ok("AI search crawlers are allowed by robots.txt.", blocked_bots=blocked)
    return fail(f"robots.txt blocks AI search crawlers: {', '.join(blocked)}.", blocked_bots=blocked)


@register("air_features_as_text")
def air_features_as_text(ctx: CheckContext) -> CheckResult:
    hits = _features_in(_text(ctx), _feature_titles(ctx))
    if len(hits) >= 3:
        return ok(f"{len(hits)} Liebherr features are described in text.", found=hits)
    return fail("Liebherr features are hardly described in text (maybe only in images).", found=hits)


@register("air_faq_reviews")
def air_faq_reviews(ctx: CheckContext) -> CheckResult:
    prod = ctx.page.get("jsonld_product") or {}
    t = _text(ctx)
    found = []
    if prod.get("aggregateRating") or prod.get("review"):
        found.append("structured reviews")
    if "FAQPage" in " ".join(ctx.page.get("jsonld_types") or []):
        found.append("FAQ structured data")
    found += _found(t, [r"fragen und antworten", r"häufige fragen", r"kundenbewertung", r"bewertungen"])
    if found:
        return ok("FAQ / Q&A or reviews present.", found=found)
    return fail("No FAQ, Q&A or reviews found.")


@register("air_alt_texts")
def air_alt_texts(ctx: CheckContext) -> CheckResult:
    big = [i for i in ctx.image_info if (i.get("w") or 0) >= 240 and (i.get("h") or 0) >= 240]
    if not big:
        return human("No large images found to check.")
    good = [i for i in big if len((i.get("alt") or "").strip()) >= 8]
    share = len(good) / len(big)
    ev = {"large_images": len(big), "with_alt_text": len(good), "examples": [i.get("alt") for i in good[:3]]}
    if share >= 0.5:
        return ok(f"{len(good)} of {len(big)} large images have descriptive alt texts.", **ev)
    return fail(f"Only {len(good)} of {len(big)} large images have descriptive alt texts.", **ev)
