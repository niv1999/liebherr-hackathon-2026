# Data files — what's where (verified 2026-11-14)

All paths relative to `Hackathon 2026/`.

## 1. Product master data CSV (most valuable)
`data/2026_Vertrieb_DE_BA-DE_Gesamt___de_DE___DE.csv` (26 MB, from zip 5)
- **Separator `;`, encoding `utf-8-sig`** (BOM on first column `FMT`). Read with `pd.read_csv(f, sep=';', encoding='utf-8-sig', dtype=str)`. Some text fields contain `;`-free long German text; the python engine with `sep=None` also works.
- **Long format**: one row per (model, attribute). 77,824 rows, **556 models**, 29 categories (`LeaveNodeName`).
- Key columns: `SalesArticleDisplay` (model name, e.g. `CBNsda 5223-22`), `SalesArticleNumber`, `SalesArticleType` (German product type), `GTIN` (EAN), `EprelNumber`, `LeaveNodeName` (category), `FMT_Name` (record type), `AttributeGroupname`, `AttributeName`, `AttributeValue`, `AttributeValueFormatted`, `AttributeUnit`, `title`, `text`.
- `FMT_Name` record types:
  - `Attributes` (~114 per model): specs — dimensions (`Außenmaße: Höhe / Breite / Tiefe`), energy class, noise, volumes, temperature ranges, features…
  - `AssetsUrls` (~17 per model): `AttributeName` ∈ product_image (multiple), eu_product_fiche, operating_instructions, dimensional_drawing, energy_label_2021, spec_sheet, guarantee_label, data_3d, ce_certificate. **Real URL is in `AttributeValueFormatted`** (`https://assets-cdn.liebherr.com/versions/<uuid>/web/<file>.jpg`); `AttributeValue` is just the filename.
  - `FeaturesUrls` (~28): feature image + `title` (feature name, e.g. "NoFrost") + `text` (official German marketing description).
  - `FeatureIconsUrls` (~8): key-feature buttons (title + text) → likely the "≥5 key features" reference set.
  - `VideosUrls` (~4): feature videos (.mp4 filenames) per feature.
- Freestanding fridge-freezer category = `K2 Kühl-Gefrier-Kombinationen` (49 models). Built-in = `FI Einbau …`.
- Use: expected specs per model, official image URLs for image matching (perceptual hash), official feature list for "≥5 key features", document checks.

## 2. Assortment 2026 (SK classes, prices)
`4_Relevant_Assortment_2026_Liebherr.xlsx` (root and in package). Sheet "Artikelstamm HH VKHB 2026", 369 rows, 59 cols, German headers.
- Col G `Vertriebsartikel` (e.g. `Re 1200 001 20`), col H `Verkaufsbezeichnung` (`Re 1200-20` — matches CSV `SalesArticleDisplay`), EAN col F.
- **Col R (index 17) `Sortimentsklasse` = SK**: values '1','2','3' (+ some ints 2/3), '-' (50, none), 'frei' (7). Normalise to str.
- Col Q `Kalkulationsgruppe`: 1–3 built-in SK1–3, 4–6 freestanding SK1–3, 7 accessories, 0 SK-free.
- Also: UVP price (list price from 01.02.2026), Neuheit/Auslauf (new/discontinued), series, dimensions, volumes, energy class, noise.

## 3. LPR criteria
- `Liebherr_Challenge_Package/3_LPR_Online_Assessment_2024_CUSTOMER_EN.xlsx` → flattened to `knowledge_criteria_raw.txt` (91 lines: section | criterion | subsection | SK relevance | question | comment). Plain-language version with automatability tags: `knowledge/briefing.md` §5.
- Slide deck with explanations: `Liebherr_Challenge_Package/2_Introduction_LPR_Online_EN_2.pdf` (64 slides).

## 4. Brand page assets (2026_09 "EmpCo-Update")
`data/brand_assets/2026_09_LPR-Markenseiten_Assets_EmpCo-Update/` (videos removed; originals in zip 6):
- `0_Corporate_Identity/` official logo pos/neg PNG + logo usage PDF → logo check.
- `1_Teaser/` current campaign teasers → "is the brand page teaser current?" check.
- `2_Produktkategorien/` category images + `Liebherr_Produktkategorien_Text.xlsx`.
- `3_Beratungsservice/` advice-service images.
- `4_Liebherr_Technologien/` technology images + `Liebherr_Technologien_Text.xlsx`.
- `5_Aktionen_Versprechen/` promotions (10-year warranty, quality, energy efficiency, No.1 brand Germany, newsletter, social) + text xlsx.
- `6_Serien/` Pure/Plus/Prime/Peak series logos & images + text.
- `7_Liebherr/` "4 reasons for Liebherr", "About Liebherr".
- `2026_09_Übersicht_Update_Bilder-Videos-PDFs.pdf` = overview of what changed; `Liebherr_YouTube-Videoübersicht.pdf` = YouTube video links.

## 5. Other
- `zoom_transcript.txt` — kickoff Zoom (Liebherr part 00:47:50–01:04:30).
- `knowledge/research.md` — company/market/legal/AI-readiness research with sources.
- `knowledge/briefing.md` — full plain-language briefing (also as `Liebherr_Briefing.pdf`).
- `0_260413_Season School DeThi Paper Design Thinking*.pdf` — HNU's design thinking method (Schallmo/Williams/Lang) + Tim Brown HBR.
- Retailer example brand pages (from guideline): expert Markenwelt, EURONICS Liebherr page, EP: Liebherr Markenwelt.
