# Technical decisions (grill-me session, 17 Nov 2026)

| Topic | Decision |
|---|---|
| AI engine | **Gemini free tier** (Google AI Studio key in `app/.env` as `GEMINI_API_KEY`). Provider-agnostic layer (`lpr/llm.py`); without a key, AI criteria come back as "needs human". |
| Stack | **FastAPI + SQLite (SQLModel)** backend in `app/backend/`; **React frontend later** in `app/frontend/`, built from the teammate's mockup. |
| Finding product pages | **Automatic shop search** by model name, plus **hand-picked URLs** that override search when added. |
| Category / retailers | **Freestanding fridge-freezers** (43 models in the 2026 assortment). Crawl **EP:, MediaMarkt, expert**. Euronics + Otto shown as "blocked → needs manual assessment". Elektroplus: shop URL unknown. |
| Products per audit | **Sample per SK class** (default 2 per SK1/SK2/SK3, configurable) + a separate **listing pass** counting how many reference models are listed and available. |
| Score | **Weighted passed / weighted checked**. Not-checkable verdicts (needs human, blocked, AI unsure) are excluded and shown as **coverage** ("52 of 60 checked"). |
| Weights | **Priority sets the weight**: low/medium/high = 1/2/3, multiplied by block weight Visibility 3 > Services 2 > Advice 1. Return-risk criteria are tagged (extra weight ×1.5) and listed in their own table. AI-readiness is a **separate score**, not part of the LPR score. |
| AI feedback | Human overrides + comments are stored per criterion; the latest few are injected into that criterion's AI prompt as "past corrections". |
| Jobs | **In-process background jobs** (one audit at a time, to spare RAM); progress in the `auditrun` table; **APScheduler** in the same process for the interval schedule. |
| Alerts | **In-app notifications** table, created when every audit finishes. Email can come later. |
| Users | **No login**; overrides and feedback carry a "reviewer name". |
| First slice | **Product-page criteria + AI-readiness + listing count**. Brand page, services and advice next. |

## Shop search (tested 17 Nov)
| Retailer | Search URL | Product link pattern |
|---|---|---|
| EP: | `https://www.ep.de/search?text=<q>` | `/p/<id>/<model-slug>` |
| MediaMarkt | `https://www.mediamarkt.de/de/search.html?query=<q>` | `/de/product/_liebherr-<model-slug>-...html` |
| expert | `https://www.expert.de/suche?q=<q>` (redirects to `/shop/suche`) | `/shop/unsere-produkte/.../<id>-<model-slug>-....html` |
| Euronics | blocked (403/405) | – |
| Elektroplus | elektroplus.de returns a near-empty page; real shop URL unknown | – |
