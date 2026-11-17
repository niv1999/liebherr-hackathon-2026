"""Retailer logos: only logos uploaded by the user (runtime/logos/<retailer id>.<ext>). Without one, the UI shows initials."""
from __future__ import annotations

import io
from pathlib import Path

from . import settings

LOGO_DIR = settings.RUNTIME_DIR / "logos"


def retailer_logo(retailer_id: int) -> Path | None:
    return next(iter(sorted(LOGO_DIR.glob(f"{retailer_id}.*"))), None) if LOGO_DIR.exists() else None


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
