"""Central configuration. Values come from environment variables / app/.env."""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[1]
APP_DIR = BACKEND_DIR.parent
load_dotenv(APP_DIR / ".env")

RUNTIME_DIR = Path(os.getenv("LPR_RUNTIME_DIR", APP_DIR / "runtime"))
ARTIFACTS_DIR = RUNTIME_DIR / "artifacts"
DB_URL = os.getenv("LPR_DB_URL", f"sqlite:///{(RUNTIME_DIR / 'lpr.db').as_posix()}")

REFERENCE_FILE = Path(__file__).resolve().parent / "reference" / "products.json"
CRITERIA_FILE = Path(__file__).resolve().parent / "reference" / "criteria.yaml"
RETAILERS_FILE = Path(__file__).resolve().parent / "reference" / "retailers.yaml"

# AI provider
LLM_PROVIDER = os.getenv("LPR_LLM_PROVIDER", "gemini")  # gemini | none
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-opus-5-5")
ENV_FILE = APP_DIR / ".env"
LLM_MIN_INTERVAL_S = float(os.getenv("LPR_LLM_MIN_INTERVAL_S", "6.5"))  # free tier ~10 requests/min
AI_CONFIDENCE_THRESHOLD = float(os.getenv("LPR_AI_CONFIDENCE_THRESHOLD", "0.6"))
FEEDBACK_EXAMPLES_IN_PROMPT = int(os.getenv("LPR_FEEDBACK_EXAMPLES", "5"))
ESCALATION_ENABLED = os.getenv("LPR_ESCALATION", "1") == "1"  # vision double-check of "not found" rule fails

# Crawling
USER_AGENT = os.getenv(
    "LPR_USER_AGENT",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
)
PAGE_TIMEOUT_MS = int(os.getenv("LPR_PAGE_TIMEOUT_MS", "45000"))
PAGE_SETTLE_MS = int(os.getenv("LPR_PAGE_SETTLE_MS", "3500"))
SAMPLES_PER_SK = int(os.getenv("LPR_SAMPLES_PER_SK", "3"))

# Scoring: block weights (Liebherr: Visibility > Services > Advice) and priority weights.
BLOCK_WEIGHTS = {"visibility": 3.0, "services": 2.0, "advice": 1.0}
PRIORITY_WEIGHTS = {"low": 1.0, "medium": 2.0, "high": 3.0}
RETURN_RISK_MULTIPLIER = 1.5


def ensure_dirs() -> None:
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
