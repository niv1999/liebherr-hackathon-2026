# Liebherr Challenge — HNU Winter School 2026

Hackathon project: **Tue 17 + Wed 18 Nov 2026** (Wed = knockout presentations to Liebherr, then top-3 final). Team of 6; the user is likely the only software developer. Other teammates contribute research, design-thinking artefacts, criteria mapping, manual audits and the pitch.

## The challenge (short)
Liebherr-Hausgeräte pays retailers a rebate (**LPR**, Liebherr Performance Rebate) if their webshops meet ~76 quality criteria (brand page, product detail page content, official Liebherr images/videos, advice/phone, delivery, payment…), stricter per assortment class **SK1/SK2/SK3**. Today ~30 retailer webshops are checked **by hand** every ~3 months. Liebherr wants an **AI-supported tool** that audits retailer webshops automatically, scores and compares retailers (quality index), and measures **AI-readiness** of their pages.
HNU's design-thinking briefing frames it customer-side: help shoppers choose the right appliance and reduce avoidable returns; prototype a better PDP or selection assistant ("Option B").

**Direction (confirmed by team 17 Nov):** Option A: evidence-based internal audit tool for Liebherr employees. Customer needs (fewer avoidable returns) are used as justification and as a return-risk flag, not as shopper-facing features. Option B is out of scope for now. Scope per HNU: 1 product category, 3–5 retailers.

## Knowledge base — read these before answering domain questions
- **`knowledge/feature_plan.md` — the agreed feature list (Phase 4, 17 Nov), clustered A–G, plus dropped ideas and why. This is the build backlog.** Focus is purely the internal Liebherr tool (no shopper features, no retailer portal, no upload mode: blocked shops are just shown as "needs manual assessment").
- **`knowledge/liebherr_answers.md` — Liebherr's written answers to our questions (17 Nov). Overrides older assumptions in the briefing.** Key points: priority retailers EURONICS, expert, MediaMarkt, OTTO, EP:, Elektroplus; weights Visibility > Services > Advice; hardest = SK3 premium PDPs, SEO descriptions, feature/benefit texts; weekly check is enough; no manual assessment or sales data shared; EmpCo = nice to have; retailer report = valuable extra.
- `knowledge/briefing.md` — plain-language briefing: challenge, glossary, Zoom quotes, **all criteria with automatability tags (§5)**, feasibility results, draft plan, team decisions, questions for Liebherr, risks. (PDF copy: `docs/deliverables/Liebherr_Briefing.pdf`.)
- `knowledge/data.md` — **how to read every data file** (CSV format, columns, where the image URLs are, SK column, brand asset folders). Check here before parsing data.
- `knowledge/research.md` — company, retailers, EU law (VBER, EmpCo, energy label), AI-readiness signals, competitor tools, with sources.
- `knowledge/knowledge_criteria_raw.txt` — raw flattened LPR assessment Excel (source of truth for criteria wording).
- `knowledge/zoom_transcript.txt` — kickoff Zoom; Liebherr part at 00:47:50–01:04:30.
- `knowledge/dt_handout.txt` — text of HNU's 122-slide "Design Thinking – From the Design Challenge to the Prototype" (phase templates, examples, prompt catalogue). **Use its templates/phrasing when helping with phase deliverables.**
- `knowledge/phase1_design_challenge.md` — team's Phase 1 draft (also `docs/deliverables/Phase1_Design_Challenge.docx`). Users chosen by team: Liebherr employees + retailers.
- Role on site: Claude is the team's "8th innovator" — brainstorm and support, don't do the team's tasks for them.
- Original material in `docs/`: `docs/challenge/` (Liebherr_Challenge_Package/, guideline, HNU briefing, schedule), `docs/design-thinking/` (HNU DT handout/slides, papers `0_260413_*`), `docs/deliverables/` (our briefing PDF, Phase 1 docx). Local-only big files (video, audio, duplicates) are in git-ignored `data/local-only/`.

## Environment
- Windows 11, **8 GB RAM (tight — avoid heavy local models; close other apps before Playwright runs), C: drive nearly full (~15 GB free)**. No NVIDIA GPU.
- Code lives in `app/` with a uv venv: run Python via `app/.venv/Scripts/python.exe` (Python 3.11). Installed: playwright (+chromium headless shell), anthropic, httpx, beautifulsoup4, lxml, extruct, pandas, openpyxl, pillow, imagehash, streamlit, pyyaml, python-dotenv, rich.
- Install new packages with `uv pip install --python app/.venv/Scripts/python.exe <pkg>`.
- Use `python -X utf8` (console is cp1255; German umlauts crash prints otherwise).
- Data in `data/` (product CSV + brand assets without videos). Don't commit `data/` or the big zips/video.
- **No paid LLM API key yet** (user declined to spend money; engine undecided). Keep the LLM layer provider-agnostic (Claude / Gemini free tier / Azure). Claude Code itself can act as the AI judge during prototyping.
- Colab transcription cell for lecture recordings: `tools/colab_transcribe_cell.py`.

## Feasibility facts (tested 2026-11-14 on CBNsda 5223-22)
- EP: (ep.de), MediaMarkt, Expert: load fine with plain HTTP + Playwright. EP has JSON-LD Product (name, GTIN, price, availability).
- **Euronics: 403 for all automated access; Otto: empty page** → fallback = upload mode (saved HTML/screenshot) or user's real browser.
- Syndicated Liebherr content (Loadbee, Cliplister) may be injected by JS → prefer rendered DOM via Playwright.

## How to work with this user
- **One step at a time.** Short, focused replies in plain language; no walls of text, no unexplained jargon. Ask before branching into long threads.
- Team decisions (category, retailers, scope, engine) are made **with the team on site** — present options + a recommendation, don't lock them in.
- Suggest the right model/effort per task; delegate routine research/boilerplate to cheaper subagents (e.g. Sonnet) when useful.
- Don't spend the user's money (paid APIs, subscriptions) without asking.
- During the build: get one retailer working end-to-end first, cache audit results, and keep a recorded backup of the demo.

## Repo layout
- `app/backend/` — FastAPI + SQLite backend (`lpr/` package, `scripts/`, `tests/`). `app/frontend/` — React app (later). `app/runtime/` — local DB + screenshots (git-ignored). Decisions: `knowledge/tech_decisions.md`.
- `knowledge/` — markdown knowledge base, transcripts, criteria text.
- `docs/` — original PDFs/Excel from Liebherr and HNU, plus our deliverables.
- `tools/` — helper scripts (Colab transcription).
- `data/` — git-ignored big raw data (product CSV, brand assets, `local-only/` video/audio/duplicates).
