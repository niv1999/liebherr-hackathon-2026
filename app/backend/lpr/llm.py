"""Provider-agnostic AI layer.

`get_provider()` returns an object with:
  judge(prompt, images) -> AIJudgement   (structured verdict for AI-judged criteria)
  answer(prompt) -> str                   (free text, used by the AI shopper simulator)
Add another provider (Claude, OpenAI, Azure) by implementing the same two methods.
"""
from __future__ import annotations

import threading
import time
from pathlib import Path
from typing import Literal, Protocol

from pydantic import BaseModel, Field

from . import settings


class AIJudgement(BaseModel):
    verdict: Literal["pass", "fail", "unsure"]
    confidence: float = Field(ge=0, le=1, description="0..1, how sure you are")
    reasoning: str = Field(description="2-4 sentences in English explaining the verdict")
    evidence: list[str] = Field(default_factory=list, description="Short quotes / observations from the page")


class Provider(Protocol):
    name: str
    available: bool

    def judge(self, prompt: str, images: list[Path] | None = None) -> AIJudgement: ...

    def answer(self, prompt: str) -> str: ...


class NoProvider:
    name = "none"
    available = False

    def judge(self, prompt: str, images: list[Path] | None = None) -> AIJudgement:
        raise RuntimeError("No AI provider configured (set GEMINI_API_KEY in app/.env).")

    def answer(self, prompt: str) -> str:
        raise RuntimeError("No AI provider configured (set GEMINI_API_KEY in app/.env).")


class GeminiProvider:
    name = "gemini"

    def __init__(self, api_key: str, model: str):
        from google import genai

        self.client = genai.Client(api_key=api_key)
        self.model = model
        self.available = True
        self._lock = threading.Lock()
        self._last = 0.0

    def _throttle(self) -> None:
        with self._lock:
            wait = settings.LLM_MIN_INTERVAL_S - (time.monotonic() - self._last)
            if wait > 0:
                time.sleep(wait)
            self._last = time.monotonic()

    def _call(self, contents, config):
        from google.genai import errors

        delay = 10.0
        for attempt in range(4):
            self._throttle()
            try:
                return self.client.models.generate_content(model=self.model, contents=contents, config=config)
            except errors.APIError as e:  # 429 rate limit / 5xx: back off and retry
                if getattr(e, "code", None) in (429, 500, 503) and attempt < 3:
                    time.sleep(delay)
                    delay *= 2
                    continue
                raise

    def judge(self, prompt: str, images: list[Path] | None = None) -> AIJudgement:
        from google.genai import types

        parts: list = []
        for p in images or []:
            if p and Path(p).exists():
                parts.append(types.Part.from_bytes(data=Path(p).read_bytes(), mime_type="image/jpeg"))
        parts.append(prompt)
        cfg = types.GenerateContentConfig(temperature=0, response_mime_type="application/json",
                                          response_schema=AIJudgement)
        resp = self._call(parts, cfg)
        if getattr(resp, "parsed", None) is not None:
            return resp.parsed
        return AIJudgement.model_validate_json(resp.text)

    def answer(self, prompt: str) -> str:
        from google.genai import types

        resp = self._call([prompt], types.GenerateContentConfig(temperature=0.2))
        return (resp.text or "").strip()


_provider: Provider | None = None


def get_provider() -> Provider:
    global _provider
    if _provider is None:
        if settings.LLM_PROVIDER == "gemini" and settings.GEMINI_API_KEY:
            _provider = GeminiProvider(settings.GEMINI_API_KEY, settings.GEMINI_MODEL)
        else:
            _provider = NoProvider()
    return _provider
