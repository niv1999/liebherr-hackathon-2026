"""Checks for the retailer's Liebherr brand page and for shop-wide behaviour (shop search)."""
from __future__ import annotations

import io
import re
from functools import lru_cache

from .base import CheckContext, CheckResult, fail, human, ok, register

LIEBHERR_TECH = ["BioFresh", "NoFrost", "DuoCooling", "SmartDevice", "EasyFresh", "PowerCooling", "SuperSilent",
                 "VarioSpace", "IceMaker", "HydroBreeze", "InfinitySpring", "FreshAir", "SoftSystem", "EasyTwist",
                 "VarioTemp", "Vinidor", "InfinityLight"]
OTHER_BRANDS = ["Bosch", "Siemens", "Samsung", "AEG", "Miele", "Gorenje", "Beko", "Haier", "Neff", "LG Electronics",
                "Bauknecht", "Hisense", "Gaggenau", "Smeg", "Sharp"]


def _brand_text(ctx: CheckContext) -> str:
    return (ctx.page.get("content_text") or ctx.page.get("text") or "")


@register("brand_exists")
def brand_exists(ctx: CheckContext) -> CheckResult:
    words = len(_brand_text(ctx).split())
    if ctx.page.get("blocked_reason"):
        return human(f"Brand page could not be loaded automatically ({ctx.page['blocked_reason']}).")
    if "liebherr" in _brand_text(ctx).lower() and words >= 80:
        return ok(f"A Liebherr brand page exists ({words} words of content).", url=ctx.page.get("url"), words=words)
    return fail("No real Liebherr brand page found at the expected address (page empty, redirected or not about Liebherr).",
                url=ctx.page.get("url"), final_url=ctx.page.get("final_url"), words=words)


@lru_cache(maxsize=1)
def _logo_hash():
    import imagehash
    from PIL import Image

    from .. import settings
    img = Image.open(settings.REFERENCE_FILE.parent / "liebherr_logo.png").convert("RGBA")
    bg = Image.new("RGB", img.size, (255, 255, 255))
    bg.paste(img, mask=img.split()[3])
    return imagehash.phash(bg)


@register("brand_logo")
def brand_logo(ctx: CheckContext) -> CheckResult:
    import httpx
    import imagehash
    from PIL import Image

    from .. import settings
    from ..images import _trim

    # only real logo images: "logo" in file name or alt text (not campaign banners that mention Liebherr)
    cands = [i for i in ctx.image_info if i.get("src", "").startswith("http")
             and re.search(r"logo", (i.get("src", "") + " " + (i.get("alt") or "")), re.I)
             and re.search(r"liebherr", (i.get("src", "") + " " + (i.get("alt") or "")), re.I)][:12]
    if not cands:
        return human("No Liebherr logo image found on the brand page (it may be an SVG or CSS image).")
    best = None
    for i in cands:
        if i["src"].lower().split("?")[0].endswith(".svg"):
            continue
        try:
            r = httpx.get(i["src"], headers={"User-Agent": settings.USER_AGENT}, timeout=10, follow_redirects=True)
            im = Image.open(io.BytesIO(r.content)).convert("RGBA")
            bg = Image.new("RGB", im.size, (255, 255, 255))
            bg.paste(im, mask=im.split()[3])
            d = int(imagehash.phash(_trim(bg)) - _logo_hash())
            if best is None or d < best[0]:
                best = (d, i["src"])
        except Exception:
            continue
    if best and best[0] <= 12:
        return ok("The current official Liebherr logo is used.", logo=best[1], distance=best[0])
    svg = [i["src"] for i in cands if i["src"].lower().split("?")[0].endswith(".svg")]
    if svg:
        return human("A Liebherr logo is shown as SVG; its version can't be compared automatically.", logo=svg[0])
    if best is None:
        return human("A Liebherr logo image was found but could not be compared automatically.")
    return fail("The Liebherr logo on the page does not match the current official logo.",
                closest=best[1] if best else None, distance=best[0] if best else None)


@register("brand_categories")
def brand_categories(ctx: CheckContext) -> CheckResult:
    t = _brand_text(ctx).lower()
    pairs = {"built-in / freestanding": bool(re.search(r"einbau", t) and re.search(r"freistehend|stand", t)),
             "cooling / freezing": bool(re.search(r"kühlschr|kühlen", t) and re.search(r"gefrier", t))}
    found = [k for k, v in pairs.items() if v]
    if found:
        return ok(f"Product categories are presented ({', '.join(found)}).", splits=found)
    return fail("Liebherr product categories are not presented on the brand page.")


@register("brand_technologies")
def brand_technologies(ctx: CheckContext) -> CheckResult:
    t = _brand_text(ctx).lower()
    found = [x for x in LIEBHERR_TECH if x.lower() in t]
    if len(found) >= 3:
        return ok(f"{len(found)} Liebherr technologies are presented.", technologies=found)
    return fail(f"Only {len(found)} Liebherr technologies are presented (at least 3 expected).", technologies=found)


@register("brand_products")
def brand_products(ctx: CheckContext) -> CheckResult:
    pattern = ctx.retailer.product_link_pattern
    links = ctx.page.get("links") or []
    prods = sorted({l.split("?")[0] for l in links if pattern and re.match(pattern, l)})
    lieb = [l for l in prods if "liebherr" in l.lower() or re.search(r"/(c|k)[a-z]{0,6}-?\d", l.lower())]
    if len(prods) >= 4:
        return ok(f"{len(prods)} product links on the brand page.", examples=prods[:5], liebherr_like=len(lieb))
    return fail(f"Only {len(prods)} product links found on the brand page (bestsellers/highlights expected).", examples=prods[:5])


@register("brand_seo_text")
def brand_seo_text(ctx: CheckContext) -> CheckResult:
    t = _brand_text(ctx)
    # longest text block between typical separators, approximated by sentences mentioning Liebherr
    sentences = [x for x in re.split(r"(?<=[.!?])\s+", t) if len(x.split()) >= 6]
    prose_words = sum(len(x.split()) for x in sentences)
    mentions = t.lower().count("liebherr")
    ev = {"prose_words": prose_words, "liebherr_mentions": mentions}
    if prose_words >= 200 and mentions >= 3:
        return ok(f"About {prose_words} words of descriptive text about Liebherr.", **ev)
    return fail(f"Only about {prose_words} words of descriptive text (at least 200 about Liebherr expected).", **ev)


@register("brand_advice")
def brand_advice(ctx: CheckContext) -> CheckResult:
    from .rules import PHONE

    t = _brand_text(ctx)
    found = []
    if PHONE.search(t) and re.search(r"beratung|hotline|telefon|service", t, re.I):
        found.append("phone")
    if re.search(r"video-?beratung|videoberatung|live-?beratung", t, re.I):
        found.append("video advice")
    if re.search(r"kaufberatung|ratgeber|produktberater|berater", t, re.I):
        found.append("buying guide / advisor")
    if re.search(r"\d{1,2}[:.]\d{2}\s*(–|-|bis)\s*\d{1,2}[:.]\d{2}|\d{1,2}\s*(–|-|bis)\s*\d{1,2}\s*uhr", t, re.I):
        found.append("opening hours")
    if found:
        return ok(f"Advice options shown: {', '.join(found)}.", found=found)
    return fail("No advice options (phone, video advice, buying guide) found on the brand page.")


@register("shop_search_brand")
def shop_search_brand(ctx: CheckContext) -> CheckResult:
    r = (ctx.page.get("shop_search") or {}).get("brand")
    if not r:
        return human("The shop search could not be tested.")
    if r.get("blocked"):
        return human(f"The shop search could not be tested ({r['blocked']}).")
    if r.get("landed_on_brand_page"):
        return ok("Searching 'Liebherr' leads to the Liebherr brand page.", final_url=r.get("final_url"))
    if r.get("liebherr_products_top5", 0) >= 3:
        return ok(f"Searching 'Liebherr' shows Liebherr products ({r['liebherr_products_top5']} of the top 5).", **r)
    return fail("Searching 'Liebherr' does not lead to the brand page or Liebherr products.", **r)


@register("shop_search_category")
def shop_search_category(ctx: CheckContext) -> CheckResult:
    r = (ctx.page.get("shop_search") or {}).get("category")
    if not r:
        return human("The shop search could not be tested.")
    if r.get("blocked"):
        return human(f"The shop search could not be tested ({r['blocked']}).")
    n = r.get("liebherr_products_top5", 0)
    if n >= 1:
        return ok(f"{n} Liebherr product(s) in the top 5 for 'Kühl-Gefrierkombination'.", **r)
    return fail("No Liebherr product in the top 5 for 'Kühl-Gefrierkombination'.", **r)
