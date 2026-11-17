"""Retailer logos: the shop's own apple-touch-icon / favicon, fetched once and cached in runtime/logos."""
from __future__ import annotations

import io
import re
from pathlib import Path
from urllib.parse import urljoin, urlparse

import httpx

from . import settings

LOGO_DIR = settings.RUNTIME_DIR / "logos"


def _get(url: str) -> httpx.Response | None:
    try:
        r = httpx.get(url, headers={"User-Agent": settings.USER_AGENT}, timeout=10, follow_redirects=True)
        return r if r.status_code == 200 and r.content else None
    except Exception:
        return None


def _candidates(base_url: str) -> list[str]:
    out = []
    home = _get(base_url)
    if home is not None and "html" in home.headers.get("content-type", ""):
        html = home.text
        for rel in ("apple-touch-icon", "icon", "shortcut icon"):
            for m in re.finditer(r"<link[^>]+>", html, re.I):
                tag = m.group(0)
                if re.search(rf'rel=["\'][^"\']*{rel}[^"\']*["\']', tag, re.I):
                    href = re.search(r'href=["\']([^"\']+)["\']', tag)
                    if href:
                        out.append(urljoin(base_url, href.group(1)))
    out.append(urljoin(base_url, "/favicon.ico"))
    # public icon service as last resort (only the shop's domain is sent)
    out.append(f"https://icons.duckduckgo.com/ip3/{urlparse(base_url).netloc}.ico")
    return out


def retailer_logo(retailer_id: int, base_url: str) -> Path | None:
    LOGO_DIR.mkdir(parents=True, exist_ok=True)
    for f in LOGO_DIR.glob(f"{retailer_id}.*"):
        return f
    for url in _candidates(base_url):
        r = _get(url)
        if r is None or not r.headers.get("content-type", "").startswith("image") and not url.endswith(".ico"):
            continue
        ext = {"image/png": "png", "image/svg+xml": "svg", "image/jpeg": "jpg", "image/webp": "webp"}.get(
            r.headers.get("content-type", "").split(";")[0], "ico")
        path = LOGO_DIR / f"{retailer_id}.{ext}"
        path.write_bytes(r.content)
        return path
    return None


MAX_UPLOAD = 2_000_000


def clear_logo(retailer_id: int) -> None:
    for f in LOGO_DIR.glob(f"{retailer_id}.*"):
        f.unlink(missing_ok=True)


def save_logo(retailer_id: int, data: bytes) -> Path:
    """Store an uploaded logo (PNG, JPG, WebP, GIF or SVG, max 2 MB). Raises ValueError for anything else."""
    if not data:
        raise ValueError("The file is empty.")
    if len(data) > MAX_UPLOAD:
        raise ValueError("The logo is too large (max 2 MB).")
    head = data[:1000].lstrip().lower()
    if head.startswith(b"<svg") or (head.startswith(b"<?xml") and b"<svg" in head):
        ext = "svg"
    else:
        from PIL import Image
        try:
            img = Image.open(io.BytesIO(data))
            img.verify()
        except Exception:
            raise ValueError("Please upload an image (PNG, JPG, WebP or SVG).")
        ext = {"PNG": "png", "JPEG": "jpg", "WEBP": "webp", "GIF": "gif"}.get(img.format or "")
        if not ext:
            raise ValueError("Please upload an image (PNG, JPG, WebP or SVG).")
    LOGO_DIR.mkdir(parents=True, exist_ok=True)
    clear_logo(retailer_id)
    path = LOGO_DIR / f"{retailer_id}.{ext}"
    path.write_bytes(data)
    return path
