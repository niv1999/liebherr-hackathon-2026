"""Turn a fetched HTML page into facts the checks can use (no network access here)."""
from __future__ import annotations

import json
import re
from typing import Any

from bs4 import BeautifulSoup

MAX_TEXT = 80_000


def norm(s: str | None) -> str:
    """Lowercase, unify spaces/dashes, so 'CBNsda 5223-22' matches 'cbnsda-5223-22'."""
    return re.sub(r"[\s\-_/]+", " ", (s or "").lower()).strip()


def model_slug(model: str) -> str:
    return re.sub(r"[\s_]+", "-", model.lower())


def model_core(model: str) -> str:
    """'CBNsda 5223-22' -> 'cbnsda 5223' (without the index), for looser matching."""
    return norm(re.sub(r"-\d+$", "", model.strip()))


def _jsonld_blocks(soup: BeautifulSoup) -> list[Any]:
    out = []
    for tag in soup.find_all("script", type=lambda t: t and "ld+json" in t):
        raw = tag.string or tag.get_text() or ""
        try:
            data = json.loads(raw.strip())
        except Exception:
            continue
        stack = data if isinstance(data, list) else [data]
        while stack:  # walk nested objects too (e.g. MediaMarkt: BuyAction -> object: Product)
            item = stack.pop()
            if isinstance(item, dict):
                if "@type" in item:
                    out.append(item)
                stack.extend(v for v in item.values() if isinstance(v, (dict, list)))
            elif isinstance(item, list):
                stack.extend(item)
    return out


def _is_product(d: dict) -> bool:
    t = d.get("@type")
    types = t if isinstance(t, list) else [t]
    return any(str(x).lower() in ("product", "productgroup") for x in types)


def visible_text(soup: BeautifulSoup) -> str:
    for tag in soup(["script", "style", "noscript", "svg", "template"]):
        tag.decompose()
    text = soup.get_text(" ", strip=True)
    return re.sub(r"\s+", " ", text)[:MAX_TEXT]


CHROME_HINT = re.compile(r"(^|[-_\s])(nav|navigation|menu|megamenu|header|footer|breadcrumb|cookie|consent|"
                         r"newsletter|flyout|sidebar)([-_\s]|$)", re.I)


def content_text(html: str) -> str:
    """Page text without site navigation, header, footer and cookie layers (what an AI judge should read)."""
    soup = BeautifulSoup(html or "", "lxml")
    for tag in soup(["script", "style", "noscript", "svg", "template", "nav", "header", "footer", "form", "iframe"]):
        tag.decompose()
    for tag in soup.select('[role="navigation"], [role="banner"], [role="contentinfo"], [aria-modal="true"]'):
        tag.decompose()
    for tag in list(soup.find_all(True)):
        if getattr(tag, "decomposed", False):  # inside an element removed earlier
            continue
        attrs = getattr(tag, "attrs", None) or {}
        ident = " ".join([attrs.get("id") or ""] + list(attrs.get("class") or []))
        if ident and CHROME_HINT.search(ident) and tag.name not in ("html", "body", "main"):
            tag.decompose()
    root = soup.find("main") or soup.body or soup
    text = re.sub(r"\s+", " ", root.get_text(" ", strip=True))
    return text[:MAX_TEXT]


def extract(html: str, url: str = "") -> dict[str, Any]:
    soup = BeautifulSoup(html or "", "lxml")
    blocks = _jsonld_blocks(soup)
    products = [b for b in blocks if _is_product(b)]
    product = max(products, key=len) if products else None  # the richest Product object
    title = soup.title.get_text(strip=True) if soup.title else None
    h1 = soup.find("h1")
    h1_text = h1.get_text(" ", strip=True) if h1 else None
    og_title = soup.find("meta", property="og:title")

    gtins: list[str] = []
    brand = None
    offer = None
    if product:
        for k in ("gtin13", "gtin", "gtin14", "gtin12", "ean"):
            if product.get(k):
                gtins.append(str(product[k]))
        b = product.get("brand")
        brand = b.get("name") if isinstance(b, dict) else b
        offers = product.get("offers")
        if isinstance(offers, list) and offers:
            offers = offers[0]
        if isinstance(offers, dict):
            offer = {"price": offers.get("price") or offers.get("lowPrice"),
                     "currency": offers.get("priceCurrency"), "availability": offers.get("availability")}
    # EANs written anywhere on the page (13 digits starting with Liebherr's 40168…)
    raw_eans = sorted(set(re.findall(r"\b(40168\d{8})\b", html or "")))

    lower_html = (html or "").lower()
    text = visible_text(BeautifulSoup(html or "", "lxml"))
    site_name = soup.find("meta", property="og:site_name")
    hrefs = [a["href"] for a in soup.find_all("a", href=True)]
    # spec table size: 2-cell table rows + <dt>/<dd> pairs
    spec_rows = sum(1 for tr in soup.find_all("tr") if len(tr.find_all(["td", "th"], recursive=False)) == 2)
    spec_rows += len(soup.find_all("dt"))
    # a buy box that stays visible while scrolling: sticky/fixed container mentioning the cart
    sticky_buy = any(re.search(r"warenkorb|add-?to-?cart|addtocart|in den korb|jetzt kaufen", lower_html[m.end(): m.end() + 3000])
                     for m in re.finditer(r'(?:class|id)="[^"]*(?:sticky|fixed)[^"]*"', lower_html))
    return {
        "url": url,
        "title": title,
        "h1": h1_text,
        "og_title": og_title.get("content") if og_title else None,
        "jsonld_types": sorted({str(b.get("@type")) for b in blocks}),
        "jsonld_product": product,
        "jsonld_gtins": gtins,
        "jsonld_brand": brand,
        "jsonld_offer": offer,
        "eans_in_html": raw_eans,
        "has_loadbee": "loadbee" in lower_html,
        "has_cliplister": "cliplister" in lower_html,
        "has_demoup": "demoup" in lower_html,
        "video_count": len(soup.find_all("video")) + lower_html.count("youtube.com/embed") + lower_html.count("youtube-nocookie"),
        "pdf_links": sorted({a["href"] for a in soup.find_all("a", href=True) if ".pdf" in a["href"].lower()})[:40],
        "text": text,
        "text_length": len(text),
        "content_text": content_text(html),  # without navigation/footer: used for AI prompts
        "site_name": site_name.get("content") if site_name else None,
        "cart_links": sorted({h for h in hrefs if re.search(r"warenkorb|/cart|basket|checkout", h, re.I)})[:5],
        "spec_rows": spec_rows,
        "sticky_buy": sticky_buy,
        "image_count": len(soup.find_all("img")) + len(soup.find_all("picture")),
    }
