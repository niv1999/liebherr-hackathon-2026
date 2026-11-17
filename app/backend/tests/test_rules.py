"""Unit tests for extraction, rule checks and scoring (no network).
Run: app/.venv/Scripts/python.exe -m pytest app/backend/tests -q
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from lpr.audit import find_product_link  # noqa: E402
from lpr.checks import REGISTRY, CheckContext  # noqa: E402
from lpr.checks.rules import _robots_blocks  # noqa: E402
from lpr.crawler import FetchResult  # noqa: E402
from lpr.extract import extract  # noqa: E402
from lpr.models import Criterion, Product, Retailer, Verdict  # noqa: E402
from lpr.scoring import score  # noqa: E402

PRODUCT = Product(id=1, model="CBNsda 5223-22", ean="4016803123675", sk="2", height_mm=1855, width_mm=597,
                  depth_mm=675, energy_class="A", noise_db=34, door_hinge="rechts", handle="Griffmulde",
                  data={"key_features": [{"title": t} for t in ["BioFresh", "NoFrost", "DuoCooling", "SuperSilent",
                                                                "VarioSpace", "EasyTwist-Ice"]], "features": [], "images": []})

GOOD_PAGE = """<html><head><title>Liebherr CBNsda 5223-22</title>
<script type="application/ld+json">{"@type":"BuyAction","object":{"@type":"Product","name":"Liebherr CBNsda 5223-22",
"gtin13":"4016803123675","brand":{"@type":"Brand","name":"LIEBHERR"},
"offers":{"price":"1399","priceCurrency":"EUR","availability":"https://schema.org/InStock"}}}</script></head>
<body><h1>Liebherr CBNsda 5223-22 Kühl-Gefrierkombination</h1>
<p>BioFresh hält Lebensmittel länger frisch. NoFrost: nie wieder abtauen. DuoCooling, SuperSilent, VarioSpace.</p>
<table><tr><td>Höhe</td><td>185,5 cm</td></tr><tr><td>Breite</td><td>59,7 cm</td></tr><tr><td>Tiefe</td><td>67,5 cm</td></tr>
<tr><td>Energieeffizienzklasse</td><td>A</td></tr><tr><td>Geräuschemission in dB(A)</td><td>34</td></tr>
<tr><td>Nutzinhalt gesamt</td><td>320 l</td></tr><tr><td>Türanschlag</td><td>rechts, wechselbar</td></tr>
<tr><td>Griff</td><td>Griffmulde</td></tr></table>
<p>Energielabel | Produktdatenblatt | Bedienungsanleitung</p>
<p>Beratung: Rufen Sie uns an unter 0800 123 4567 (Mo-Fr 8-20 Uhr)</p>
<p>Zahlung mit PayPal, Klarna oder Kreditkarte. Finanzierung möglich. Sofort lieferbar.</p>
<p>Lieferung inkl. Altgerätemitnahme und Anschluss, Versandkosten 39,90 €</p></body></html>"""

BAD_PAGE = "<html><body><h1>CBNsda 5223 Kühlschrank</h1><p>Toller Kühlschrank.</p></body></html>"


def ctx_for(html: str, key: str) -> CheckContext:
    c = Criterion(code="T", block="visibility", section="s", title="t", rule_key=key)
    return CheckContext(retailer=Retailer(name="r", base_url="https://x"), criterion=c, product=PRODUCT,
                        page=extract(html, "https://x/p"), raw_page=extract(html), raw_status=200)


def run(html: str, key: str) -> str:
    return REGISTRY[key](ctx_for(html, key)).status


def test_good_page_passes_core_rules():
    for key in ["name_has_brand", "name_has_model", "ean_matches", "key_features_count", "energy_label_and_sheet",
                "manual_available", "shipping_costs", "dimensions_text", "tech_data_complete", "hinge_and_handle",
                "phone_visible", "payment_methods", "financing", "delivery_services", "availability_shown",
                "air_jsonld_product", "air_jsonld_identifiers", "air_offer", "air_no_js_content", "air_features_as_text"]:
        assert run(GOOD_PAGE, key) == "pass", key


def test_bad_page_fails():
    for key in ["name_has_brand", "name_has_model", "key_features_count", "dimensions_text", "hinge_and_handle",
                "phone_visible", "payment_methods", "air_jsonld_product"]:
        assert run(BAD_PAGE, key) == "fail", key
    assert run(BAD_PAGE, "ean_matches") == "needs_human"


def test_nested_jsonld_is_found():
    e = extract(GOOD_PAGE)
    assert e["jsonld_gtins"] == ["4016803123675"] and e["jsonld_offer"]["price"] == "1399"


def test_robots_parsing():
    robots = "User-agent: *\nDisallow: /checkout\n\nUser-agent: GPTBot\nDisallow: /\n"
    assert _robots_blocks(robots, "GPTBot") is True
    assert _robots_blocks(robots, "OAI-SearchBot") is False
    expert_style = "User-agent: OAI-SearchBot\nDisallow: /\nAllow: /shop/unsere-produkte/\n"
    assert _robots_blocks(expert_style, "OAI-SearchBot", "/shop/unsere-produkte/x/1-cbn.html") is False
    assert _robots_blocks(expert_style, "OAI-SearchBot", "/checkout") is True


def test_find_product_link_prefers_exact_model():
    f = FetchResult(url="s", links=["https://www.ep.de/p/1/cbnbda-5223-22", "https://www.ep.de/p/2/cbnsda-5223-22?x=1",
                                    "https://www.ep.de/p/3/cbnsfc-5223-22"])
    assert find_product_link(f, r"https://www\.ep\.de/p/\d+/[^?#]+", "CBNsda 5223-22") == "https://www.ep.de/p/2/cbnsda-5223-22"


def test_scoring_excludes_unchecked_and_weights():
    hi = Criterion(id=1, code="A", block="visibility", section="s", title="a", priority="high")
    lo = Criterion(id=2, code="B", block="advice", section="s", title="b", priority="low")
    air = Criterion(id=3, code="C", block="ai_readiness", section="s", title="c")
    vs = [Verdict(run_id=1, criterion_id=1, status="pass"), Verdict(run_id=1, criterion_id=2, status="fail"),
          Verdict(run_id=1, criterion_id=2, status="needs_human"), Verdict(run_id=1, criterion_id=3, status="fail")]
    r = score(vs, {1: hi, 2: lo, 3: air})
    assert r["lpr_score"] == 90.0  # 9 / (9 + 1)
    assert r["checked_count"] == 2 and r["applicable_count"] == 3
    assert r["ai_readiness_score"] == 0.0


def test_green_claims_empco():
    vague = "<html><body><main><p>Dieser Kühlschrank ist besonders umweltfreundlich und klimaneutral.</p></main></body></html>"
    backed = "<html><body><main><p>Nachhaltig: Energieeffizienzklasse A, nur 109 kWh pro Jahr.</p></main></body></html>"
    label = "<html><body><main><p>Go Green Vertriebskennzeichen</p></main></body></html>"
    assert run(vague, "green_claims") == "fail"
    assert run(backed, "green_claims") == "pass"
    assert run(label, "green_claims") == "needs_human"
