# HeLPR: start the app

HeLPR audits retailer webshops against Liebherr's LPR Online criteria.
Backend = FastAPI + SQLite (`backend/`), frontend = React + Vite + Tailwind (`frontend/`).

## Start (two terminals, from the repo root)
```bash
# 1) backend API on :8000   (docs: http://localhost:8000/docs)
app/.venv/Scripts/python.exe -X utf8 -m uvicorn lpr.api:app --app-dir app/backend --port 8000

# 2) frontend on :5173      (open http://localhost:5173)
cd app/frontend && npm install && npm run dev
```
Or double-click `app/start.cmd` (Windows), which opens both.

## First steps in the app
1. **Run audit** (top right) → pick retailers → start. Each retailer takes about 1–3 minutes.
2. **Overview** shows the ranking. Click a retailer to open its **scorecard**.
3. In the scorecard, open a criterion to see the **evidence** (screenshot, reasoning). Use **Correct verdict** or **Teach the AI**.
4. **To-do for retailer** shows what the retailer should fix → **PDF report** / **Excel**.
5. **Criteria & weights**: change a priority (= weight), switch criteria on or off, edit the AI instructions.
6. **Settings**: weekly automatic audits, pages per SK class, deadline for fixes.

The AI judge needs a free Gemini key in `app/.env` (`GEMINI_API_KEY=...`). Without it, AI criteria show as "needs human".
Backend details: [backend/README.md](backend/README.md).
