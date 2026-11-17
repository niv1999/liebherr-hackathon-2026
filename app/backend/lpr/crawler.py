"""Page fetching: a real browser (Playwright) for the rendered page + plain HTTP for the no-JavaScript view.

One `Crawler` is opened per audit run and reused for all pages (saves RAM and time).
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import quote_plus, urljoin, urlparse

import httpx
from playwright.sync_api import Page, sync_playwright

from . import settings

CONSENT_BUTTON = re.compile(
    r"^\s*(alle akzeptieren|alles akzeptieren|akzeptieren|alle zulassen|alle cookies akzeptieren|zustimmen|"
    r"einverstanden|accept all|accept|ok, verstanden|verstanden)\s*$",
    re.I,
)
BLOCK_MARKERS = re.compile(r"access denied|request blocked|captcha|zugriff verweigert|are you a robot|cf-chl|bot detection", re.I)


@dataclass
class FetchResult:
    url: str
    final_url: str | None = None
    status: int | None = None
    html: str = ""
    blocked: bool = False
    block_reason: str | None = None
    html_path: str | None = None
    screenshot_path: str | None = None
    fullpage_path: str | None = None
    links: list[str] = field(default_factory=list)
    image_info: list[dict] = field(default_factory=list)  # src, alt, natural size of <img> elements
    load_ms: int | None = None  # time until the page's DOM was ready
    error: str | None = None


def detect_block(status: int | None, html: str) -> str | None:
    if status in (401, 403, 405, 429, 503):
        return f"HTTP {status}"
    if len(html) < 3000:
        return "empty or near-empty page"
    head = html[:20000]
    if BLOCK_MARKERS.search(head) and len(html) < 60000:
        return "bot protection page"
    return None


class Crawler:
    def __init__(self, out_dir: Path):
        self.out_dir = out_dir
        self.out_dir.mkdir(parents=True, exist_ok=True)
        self._pw = None
        self._browser = None
        self._ctx = None

    # -- lifecycle -------------------------------------------------------
    def __enter__(self) -> "Crawler":
        self._pw = sync_playwright().start()
        self._browser = self._pw.chromium.launch(args=["--disable-dev-shm-usage"])
        self._ctx = self._browser.new_context(
            user_agent=settings.USER_AGENT, locale="de-DE", viewport={"width": 1366, "height": 900}
        )
        return self

    def __exit__(self, *exc) -> None:
        for obj in (self._ctx, self._browser):
            try:
                obj and obj.close()
            except Exception:
                pass
        if self._pw:
            self._pw.stop()

    # -- helpers ---------------------------------------------------------
    @staticmethod
    def _accept_cookies(page: Page) -> None:
        for sel in ("#onetrust-accept-btn-handler", "#uc-btn-accept-banner", "button[data-testid='uc-accept-all-button']"):
            try:
                if page.locator(sel).first.is_visible(timeout=500):
                    page.locator(sel).first.click(timeout=1500)
                    page.wait_for_timeout(500)
                    return
            except Exception:
                pass
        try:
            btn = page.get_by_role("button", name=CONSENT_BUTTON).first
            if btn.is_visible(timeout=1000):
                btn.click(timeout=2000)
                page.wait_for_timeout(500)
        except Exception:
            pass

    @staticmethod
    def _scroll_through(page: Page) -> None:
        """Scroll down in steps so lazy-loaded content (Loadbee, Cliplister, images) appears."""
        try:
            page.evaluate(
                """async () => {
                    const h = () => document.body ? document.body.scrollHeight : 0;
                    for (let y = 0; y < Math.min(h(), 14000); y += 700) {
                        window.scrollTo(0, y);
                        await new Promise(r => setTimeout(r, 180));
                    }
                    window.scrollTo(0, 0);
                }"""
            )
            page.wait_for_timeout(800)
        except Exception:
            pass

    # -- public API ------------------------------------------------------
    def fetch(self, url: str, name: str, screenshots: bool = True) -> FetchResult:
        res = FetchResult(url=url)
        page = self._ctx.new_page()
        try:
            import time as _t
            t0 = _t.monotonic()
            resp = page.goto(url, wait_until="domcontentloaded", timeout=settings.PAGE_TIMEOUT_MS)
            res.load_ms = int((_t.monotonic() - t0) * 1000)
            res.status = resp.status if resp else None
            page.wait_for_timeout(settings.PAGE_SETTLE_MS)
            self._accept_cookies(page)
            if screenshots:
                self._scroll_through(page)
            res.final_url = page.url
            res.html = page.content()
            res.block_reason = detect_block(res.status, res.html)
            res.blocked = res.block_reason is not None
            res.links = page.eval_on_selector_all("a[href]", "els => els.map(e => e.href)")
            res.image_info = page.eval_on_selector_all(
                "img",
                "els => els.map(e => ({src: e.currentSrc || e.src, alt: e.alt || '', w: e.naturalWidth, h: e.naturalHeight}))",
            )
            html_file = self.out_dir / f"{name}.html"
            html_file.write_text(res.html, encoding="utf-8")
            res.html_path = str(html_file)
            if screenshots:
                shot = self.out_dir / f"{name}.jpg"
                page.screenshot(path=str(shot), type="jpeg", quality=70)
                res.screenshot_path = str(shot)
                full = self.out_dir / f"{name}_full.jpg"
                page.screenshot(path=str(full), type="jpeg", quality=45, full_page=True)
                res.fullpage_path = str(full)
        except Exception as e:  # network errors, timeouts
            res.error = f"{type(e).__name__}: {str(e)[:300]}"
            res.blocked = True
            res.block_reason = res.block_reason or "could not load page"
        finally:
            page.close()
        return res

    def search(self, search_url_template: str, query: str, name: str) -> FetchResult:
        url = search_url_template.replace("{query}", quote_plus(query))
        return self.fetch(url, name, screenshots=False)


def raw_fetch(url: str, timeout: float = 20.0) -> tuple[int | None, str]:
    """Plain HTTP GET without JavaScript: what many AI crawlers see."""
    try:
        r = httpx.get(url, headers={"User-Agent": settings.USER_AGENT, "Accept-Language": "de-DE,de;q=0.9"},
                      follow_redirects=True, timeout=timeout)
        return r.status_code, r.text
    except Exception:
        return None, ""


def robots_txt(base_url: str) -> str | None:
    p = urlparse(base_url)
    status, text = raw_fetch(f"{p.scheme}://{p.netloc}/robots.txt", timeout=10)
    return text if status == 200 else None


def absolute(base: str, href: str) -> str:
    return urljoin(base, href)
