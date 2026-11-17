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

    def judge(self, prompt: str, images: list[Path] | None = None, schema: type[BaseModel] = AIJudgement): ...

    def answer(self, prompt: str) -> str: ...


class NoProvider:
    name = "none"
    available = False

    def judge(self, prompt: str, images: list[Path] | None = None, schema: type[BaseModel] = AIJudgement):
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

    def judge(self, prompt: str, images: list[Path] | None = None, schema: type[BaseModel] = AIJudgement):
        from google.genai import types

        parts: list = []
        for p in images or []:
            if p and Path(p).exists():
                parts.append(types.Part.from_bytes(data=Path(p).read_bytes(), mime_type="image/jpeg"))
        parts.append(prompt)
        cfg = types.GenerateContentConfig(temperature=0, response_mime_type="application/json",
                                          response_schema=schema)
        resp = self._call(parts, cfg)
        if getattr(resp, "parsed", None) is not None:
            return resp.parsed
        return schema.model_validate_json(resp.text)

    def answer(self, prompt: str) -> str:
        from google.genai import types

        resp = self._call([prompt], types.GenerateContentConfig(temperature=0.2))
        return (resp.text or "").strip()


class FileProvider:
    """Offline judge for testing without an API key (LPR_LLM_PROVIDER=file).

    Each request is written to runtime/ai_exchange/requests/<key>.json (prompt + image paths). A human or
    Claude Code writes the answer to runtime/ai_exchange/answers/<key>.json:
      judge:  {"verdict": "pass|fail|unsure", "confidence": 0.9, "reasoning": "...", "evidence": ["..."]}
      answer: {"text": "..."}
    Until an answer exists, judge() returns 'unsure' (-> needs human). Re-judge the verdict afterwards.
    """

    name = "file"
    available = True

    def __init__(self) -> None:
        self.dir = settings.RUNTIME_DIR / "ai_exchange"
        (self.dir / "requests").mkdir(parents=True, exist_ok=True)
        (self.dir / "answers").mkdir(parents=True, exist_ok=True)

    def _exchange(self, kind: str, prompt: str, images: list[Path] | None) -> dict | None:
        import hashlib
        import json

        imgs = [str(p) for p in images or [] if p]
        key = hashlib.sha1((kind + prompt + "|".join(imgs)).encode("utf-8")).hexdigest()[:16]
        ans = self.dir / "answers" / f"{key}.json"
        if ans.exists():
            return json.loads(ans.read_text(encoding="utf-8"))
        (self.dir / "requests" / f"{key}.json").write_text(
            json.dumps({"key": key, "kind": kind, "images": imgs, "prompt": prompt}, ensure_ascii=False, indent=1),
            encoding="utf-8")
        return None

    def judge(self, prompt: str, images: list[Path] | None = None, schema: type[BaseModel] = AIJudgement):
        a = self._exchange("judge", prompt, images)
        if a is None:
            raise TimeoutError("Waiting for the offline judge's answer (see runtime/ai_exchange/requests).")
        return schema.model_validate(a)

    def answer(self, prompt: str) -> str:
        a = self._exchange("answer", prompt, None)
        return a["text"] if a else "Waiting for the offline judge's answer."


class ClaudeProvider:
    """Anthropic Claude via the official SDK. Structured output with messages.parse + a Pydantic schema."""

    name = "claude"

    def __init__(self, api_key: str, model: str):
        import anthropic

        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model
        self.available = True

    @staticmethod
    def _content(prompt: str, images: list[Path] | None) -> list[dict]:
        import base64

        blocks: list[dict] = []
        for p in images or []:
            if p and Path(p).exists():
                data = base64.standard_b64encode(Path(p).read_bytes()).decode("utf-8")
                blocks.append({"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": data}})
        blocks.append({"type": "text", "text": prompt})
        return blocks

    def judge(self, prompt: str, images: list[Path] | None = None, schema: type[BaseModel] = AIJudgement):
        resp = self.client.messages.parse(
            model=self.model,
            max_tokens=16000,
            messages=[{"role": "user", "content": self._content(prompt, images)}],
            output_format=schema,
        )
        if resp.stop_reason == "refusal" or resp.parsed_output is None:
            raise RuntimeError(f"Claude returned no verdict (stop_reason={resp.stop_reason})")
        return resp.parsed_output

    def answer(self, prompt: str) -> str:
        resp = self.client.messages.create(model=self.model, max_tokens=4000,
                                           messages=[{"role": "user", "content": prompt}])
        return "".join(b.text for b in resp.content if b.type == "text").strip()


_provider: Provider | None = None


def reset_provider() -> None:
    """Called after the AI settings change, so the next call uses the new provider / key."""
    global _provider
    _provider = None


def get_provider() -> Provider:
    import os

    global _provider
    if _provider is None:
        kind = os.getenv("LPR_LLM_PROVIDER", settings.LLM_PROVIDER)
        if kind == "file":
            _provider = FileProvider()
        elif kind == "gemini" and os.getenv("GEMINI_API_KEY"):
            _provider = GeminiProvider(os.environ["GEMINI_API_KEY"], os.getenv("GEMINI_MODEL", settings.GEMINI_MODEL))
        elif kind == "claude" and os.getenv("ANTHROPIC_API_KEY"):
            _provider = ClaudeProvider(os.environ["ANTHROPIC_API_KEY"], os.getenv("CLAUDE_MODEL", settings.CLAUDE_MODEL))
        else:
            _provider = NoProvider()
    return _provider
