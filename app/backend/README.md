# LPR Inspector: backend

FastAPI + SQLite service that audits retailer webshops against Liebherr's LPR Online criteria.
Design decisions: [`knowledge/tech_decisions.md`](../../knowledge/tech_decisions.md) · feature backlog: [`knowledge/feature_plan.md`](../../knowledge/feature_plan.md).

## Run it
```bash
# from the repo root (Windows, Git Bash)
uv venv app/.venv --python 3.11            # only on a new machine
uv pip install --python app/.venv/Scripts/python.exe -r app/backend/requirements.txt
app/.venv/Scripts/python.exe -m playwright install chromium   # only on a new machine
cp app/.env.example app/.env               # then paste a free Gemini key (https://aistudio.google.com/apikey)

app/.venv/Scripts/python.exe -X utf8 -m uvicorn lpr.api:app --app-dir app/backend --port 8000
```
API docs (try every endpoint in the browser): http://localhost:8000/docs

Without a Gemini key everything works, but AI-judged criteria come back as "needs human".

Useful scripts:
- `scripts/run_audit.py "EP:" [--listing] [--codes PDP-01,PDP-04]`: run one audit synchronously and print the verdicts.
- `scripts/build_reference.py`: rebuild `lpr/reference/products.json` from the raw Liebherr files (needs `data/`).
- Tests: `app/.venv/Scripts/python.exe -m pytest app/backend/tests -q`

## How an audit works (`lpr/audit.py`)
1. **Plan**: pick N models per SK class (default 1-2, setting `audit_defaults.samples_per_sk`); hand-picked URLs first, else the shop search finds the product page.
2. **Delegate & check**: open each page in a real browser (`crawler.py`: cookie banner, scroll for lazy content, screenshots) + a plain no-JavaScript fetch; extract facts (`extract.py`); run every active criterion that applies to the product's SK:
   - `method: rule` → `checks/rules.py` (text, numbers, JSON-LD, robots.txt, image fingerprints vs. official Liebherr images in `images.py`)
   - `method: ai` → `checks/ai.py` (Gemini via `llm.py`; prompt = the criterion's editable `ai_prompt` + page text/screenshot + official Liebherr feature texts + the latest human feedback)
   - `method: manual` → always "needs human"
3. **Review**: AI verdicts below the confidence threshold become "needs human".
4. **Report**: `scoring.py` = weighted passed / weighted checked (priority low/med/high = 1/2/3 × block weight Visibility 3, Services 2, Advice 1, × 1.5 for return-risk criteria). AI-readiness is a separate score. A notification is created.
5. Optional **listing pass**: how many of the 43 reference models are listed / available at the retailer.

Blocked shops (EURONICS, OTTO) end as `blocked = true` → "needs manual assessment".

## Code map
| Path | What |
|---|---|
| `lpr/models.py` | DB tables (Retailer, Product, Criterion, AuditRun, PageSnapshot, Verdict, Feedback, ListingCheck, Notification, AppSetting) |
| `lpr/reference/` | `products.json` (Liebherr master data, 43 freestanding fridge-freezers), `criteria.yaml`, `retailers.yaml` (seeded on first start; then edited via API) |
| `lpr/api/` | FastAPI routes: `routes_retailers`, `routes_criteria`, `routes_audits`, `routes_misc` (dashboard, notifications, settings, AI simulator) |
| `lpr/services.py` | read models for the UI (overview, to-do list, summaries, re-scoring) |
| `lpr/reports.py` | Excel + PDF reports |
| `lpr/jobs.py` | background audit queue (one at a time) + APScheduler interval runs |
| `app/runtime/` | git-ignored: `lpr.db`, page HTML + screenshots per run (served at `/artifacts/...`) |

## Main endpoints (for the frontend)
| Feature | Endpoint |
|---|---|
| Dashboard KPIs + ranking | `GET /api/dashboard/overview` |
| Retailer comparison matrix | `GET /api/dashboard/compare` |
| Retailers CRUD | `GET/POST /api/retailers`, `PATCH/DELETE /api/retailers/{id}` |
| Retailer overview (good / missing / needs human / return risks / listing / trend) | `GET /api/retailers/{id}/overview` |
| Hand-picked product URLs | `GET/POST /api/retailers/{id}/product-urls`, `DELETE .../{url_id}` |
| Start audit (all / some retailers, some criteria, some products) | `POST /api/audits` |
| Audit list / detail (verdicts + screenshots) | `GET /api/audits`, `GET /api/audits/{id}` |
| Override verdict, deadline, suggested fix | `PATCH /api/verdicts/{id}` |
| Feedback to the AI / re-judge one criterion | `POST /api/verdicts/{id}/feedback`, `POST /api/verdicts/{id}/rejudge` |
| To-do list, Excel, PDF | `GET /api/audits/{id}/todo`, `.../report.xlsx`, `.../report.pdf` |
| Criteria editor (weight via priority, prompt, SK, active) | `GET/POST /api/criteria`, `PATCH/DELETE /api/criteria/{id}`, `GET /api/criteria/meta` |
| Products (reference) | `GET /api/products?sk=` |
| Notifications | `GET /api/notifications`, `POST /api/notifications/{id}/read`, `POST /api/notifications/read-all` |
| Schedule / audit defaults | `GET/PUT /api/settings/schedule`, `GET/PUT /api/settings/audit-defaults` |
| AI shopper simulator / AI status | `POST /api/ai/simulate`, `GET /api/ai/status` |
| Screenshots | `/artifacts/run_<id>/<file>.jpg` (URLs are included in responses) |
