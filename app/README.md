# HeLPR

HeLPR audits retailer webshops against Liebherr's **LPR Online** criteria and scores each retailer.
Backend: FastAPI + SQLite (`backend/`). Frontend: React + Vite + Tailwind (`frontend/`).

## Start

**Easiest (Windows):** double-click `app/start.cmd` → opens http://localhost:5173

**Manually (repo root):**
```bash
# backend + built web app on one port → http://localhost:8000
cd app/frontend && npm install && npm run build && cd ../..
app/.venv/Scripts/python.exe -X utf8 -m uvicorn lpr.api:app --app-dir app/backend --port 8000

# while developing the frontend (hot reload) → http://localhost:5173
cd app/frontend && npm run dev
```
New machine: `uv venv app/.venv --python 3.11`, `uv pip install --python app/.venv/Scripts/python.exe -r app/backend/requirements.txt`, `app/.venv/Scripts/python.exe -m playwright install chromium`.

**Docker (one container, API + web app):** `docker build -t helpr .` then `docker run -p 7860:7860 helpr` → http://localhost:7860

## Using HeLPR
| Where | What |
|---|---|
| **Overview** | KPIs and the retailer ranking (score, AI-readiness, return risks, status). |
| **Run audit** (top right) | Choose retailers; optionally count listed & available models (slower). |
| **Scorecards** | Per retailer: score ring, SK1–3 and block scores, criteria with evidence (screenshot, reasoning), return risks, assortment, to-do list, PDF/Excel. Older audits: the **Audit** dropdown or click a point in the score trend. |
| **Data → Criteria** | Priority (= weight), on/off, edit AI instruction and fix advice, add/delete criteria. |
| **Data → Models** | Liebherr reference assortment (dimensions, EAN, hinge, handle); add/edit/remove, exclude from audits. |
| **Data → Retailers** | Add a shop by pasting example links (search results for "Liebherr" + any product page); HeLPR derives the patterns. |
| **Settings** | AI judge connections (Gemini / Claude, key is tested before saving), automatic audits, models per SK, fix deadline. |
| Header | EN/DE language, light/dark mode, notifications (click → opens that audit). |

Without an AI connection, AI-judged criteria show "needs human"; everything else works.
Backend details: [backend/README.md](backend/README.md).
