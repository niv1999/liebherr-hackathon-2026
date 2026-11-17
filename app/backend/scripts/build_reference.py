"""Build the compact Liebherr reference file the backend uses.

Reads the big (git-ignored) Liebherr files and writes
`lpr/reference/products.json`, which IS committed, so the backend runs on any
machine without the raw data.

Usage (from the repo root):
    app/.venv/Scripts/python.exe -X utf8 app/backend/scripts/build_reference.py
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parents[3]
CSV = REPO / "data" / "2026_Vertrieb_DE_BA-DE_Gesamt___de_DE___DE.csv"
XLSX = REPO / "docs" / "challenge" / "Liebherr_Challenge_Package" / "4_Relevant_Assortment_2026_Liebherr.xlsx"
OUT = Path(__file__).resolve().parents[1] / "lpr" / "reference" / "products.json"

# Which assortment rows we keep: freestanding fridge-freezers.
BAUFORM, GERAETEART = "freistehend", "Kombination"
CATEGORY = "fridge_freezer_freestanding"


def _num(s: str | None) -> float | None:
    if s is None or (isinstance(s, float) and pd.isna(s)):
        return None
    s = str(s).replace(".", "").replace(",", ".") if "," in str(s) else str(s)
    try:
        return float(s)
    except ValueError:
        return None


def _clean(v):
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    s = str(v).replace("\xa0", " ").strip()
    return s or None


def load_assortment() -> pd.DataFrame:
    x = pd.read_excel(XLSX, sheet_name=0)
    x.columns = range(len(x.columns))
    x = x[(x[2] == BAUFORM) & (x[3] == GERAETEART)].copy()
    out = pd.DataFrame({
        "model": x[7].astype(str).str.strip(),
        "article_no": x[4].astype(str).str.strip(),
        "ean": x[5].astype(str).str.replace(r"\.0$", "", regex=True).str.strip(),
        "sk": x[17].astype(str).str.strip(),
        "uvp_eur": pd.to_numeric(x[18], errors="coerce"),
        "new_or_discontinued": x[19].map(_clean),
        "series": x[22].map(_clean),
        "height_mm": pd.to_numeric(x[37], errors="coerce"),
        "width_mm": pd.to_numeric(x[38], errors="coerce"),
        "depth_mm": pd.to_numeric(x[39], errors="coerce"),
        "energy_class": x[52].map(_clean),
        "noise_db": pd.to_numeric(x[57], errors="coerce"),
        "volume_l": pd.to_numeric(x[40], errors="coerce"),
    })
    return out


def main() -> None:
    assortment = load_assortment()
    models = set(assortment["model"])
    d = pd.read_csv(CSV, sep=";", encoding="utf-8-sig", dtype=str)
    d = d[d["SalesArticleDisplay"].isin(models)]

    products = []
    for row in assortment.to_dict("records"):
        m = d[d["SalesArticleDisplay"] == row["model"]]
        attrs = {}
        for r in m[m["FMT_Name"] == "Attributes"].itertuples():
            name = _clean(r.AttributeName)
            val = _clean(r.AttributeValueFormatted)
            if name and val and name not in attrs:
                unit = _clean(r.AttributeUnit)
                attrs[name] = f"{val} {unit}" if unit else val

        def feats(kind: str):
            out = []
            for r in m[m["FMT_Name"] == kind].itertuples():
                title = _clean(r.title)
                if title and title not in [f["title"] for f in out]:
                    out.append({"title": title, "text": _clean(r.text), "image": _clean(r.AttributeValueFormatted)})
            return out

        assets = m[m["FMT_Name"] == "AssetsUrls"]
        images = [u for u in assets[assets["AttributeName"] == "product_image"]["AttributeValueFormatted"].map(_clean) if u]
        docs = {}
        for r in assets.itertuples():
            if r.AttributeName != "product_image" and _clean(r.AttributeValueFormatted):
                docs.setdefault(r.AttributeName, _clean(r.AttributeValueFormatted))
        videos = [{"feature": _clean(r.AttributeName), "url": _clean(r.AttributeValueFormatted)}
                  for r in m[m["FMT_Name"] == "VideosUrls"].itertuples()]

        products.append({
            **{k: (None if isinstance(v, float) and pd.isna(v) else v) for k, v in row.items()},
            "category": CATEGORY,
            "product_type": _clean(m["SalesArticleType"].iloc[0]) if len(m) else None,
            "eprel": _clean(m["EprelNumber"].iloc[0]) if len(m) else None,
            "door_hinge": attrs.get("Türanschlag"),
            "handle": attrs.get("Griff"),
            "key_features": feats("FeatureIconsUrls"),
            "features": feats("FeaturesUrls"),
            "images": images,
            "documents": docs,
            "videos": videos,
            "attributes": attrs,
            "in_product_data": len(m) > 0,
        })

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"category": CATEGORY, "products": products}, ensure_ascii=False, indent=1), encoding="utf-8")
    with_data = sum(p["in_product_data"] for p in products)
    print(f"wrote {OUT} | {len(products)} models, {with_data} with product data | SK:",
          pd.Series([p["sk"] for p in products]).value_counts().to_dict())


if __name__ == "__main__":
    main()
