"""Official image matching with perceptual hashes ("digital fingerprints").

Official images are downloaded once and their hashes cached in the runtime folder.
"""
from __future__ import annotations

import io
import json
import threading

import httpx
import imagehash
from PIL import Image

from . import settings

_CACHE_FILE = settings.RUNTIME_DIR / "official_image_hashes.json"
_lock = threading.Lock()
MAX_DISTANCE = 10  # hamming distance on 64-bit pHash; <=10 = same picture (resized/compressed)


def _load_cache() -> dict[str, str]:
    try:
        return json.loads(_CACHE_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _save_cache(c: dict[str, str]) -> None:
    _CACHE_FILE.write_text(json.dumps(c), encoding="utf-8")


def _trim(img: Image.Image) -> Image.Image:
    """Cut away white/near-white borders: shops often pad product photos into squares."""
    gray = img.convert("L")
    mask = gray.point(lambda v: 255 if v < 245 else 0)
    box = mask.getbbox()
    return img.crop(box) if box else img


def _hash_url(url: str) -> imagehash.ImageHash | None:
    try:
        r = httpx.get(url, headers={"User-Agent": settings.USER_AGENT}, timeout=15, follow_redirects=True)
        if r.status_code != 200:
            return None
        img = Image.open(io.BytesIO(r.content)).convert("RGB")
        return imagehash.phash(_trim(img))
    except Exception:
        return None


def official_hashes(urls: list[str], limit: int = 16) -> list[tuple[str, imagehash.ImageHash]]:
    with _lock:
        cache = _load_cache()
        out = []
        for u in urls[:limit]:
            if u not in cache:
                h = _hash_url(u)
                cache[u] = str(h) if h is not None else ""
            if cache[u]:
                out.append((u, imagehash.hex_to_hash(cache[u])))
        _save_cache(cache)
    return out


def match_official_images(official_urls: list[str], image_info: list[dict], max_page_images: int = 10) -> dict:
    official = official_hashes(official_urls)
    big = [i for i in image_info if (i.get("w") or 0) >= 240 and (i.get("h") or 0) >= 240 and i.get("src", "").startswith("http")]
    seen, page_imgs = set(), []
    for i in sorted(big, key=lambda i: -(i["w"] * i["h"])):
        if i["src"] not in seen:
            seen.add(i["src"])
            page_imgs.append(i)
        if len(page_imgs) >= max_page_images:
            break
    matches = []
    for img in page_imgs:
        h = _hash_url(img["src"])
        if h is None or not official:
            continue
        best_url, best = min(((u, h - oh) for u, oh in official), key=lambda x: x[1])
        if best <= MAX_DISTANCE:
            matches.append({"page_image": img["src"], "official_image": best_url, "distance": int(best)})
    return {"official_images": len(official), "page_images": len(page_imgs), "matched": len(matches), "matches": matches[:6]}
