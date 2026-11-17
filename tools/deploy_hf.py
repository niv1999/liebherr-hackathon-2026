"""Deploy HeLPR to a Hugging Face Space (Docker, free CPU tier).

One-time setup (by you, in a terminal):
  1. Create the Space on huggingface.co: New -> Space -> SDK "Docker" (blank), hardware "CPU basic (free)".
  2. Log in on this computer:  app\\.venv\\Scripts\\hf.exe auth login   (paste a token with "write" access)
  3. Export the demo data:     app\\.venv\\Scripts\\python.exe -X utf8 app\\backend\\scripts\\export_demo.py

Deploy (repeat whenever you want to update the Space):
  app\\.venv\\Scripts\\python.exe -X utf8 tools\\deploy_hf.py <your-hf-name>/<space-name>
  add --dry-run to only list what would be uploaded.

Uploads only what the Docker image needs: Dockerfile, backend, frontend sources and the demo snapshot.
Never uploads app/.env, the local database (app/runtime) or API keys (the demo database has none).
"""
from __future__ import annotations

import argparse
import fnmatch
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ALLOW = ["Dockerfile", ".dockerignore", "app/backend/**", "app/frontend/**", "app/demo/**"]
IGNORE = ["**/node_modules/**", "app/frontend/dist/**", "**/__pycache__/**", "**/*.pyc", "**/.env*", "app/runtime/**",
          "app/.venv/**", "**/.pytest_cache/**"]
SPACE_README = """---
title: HeLPR
emoji: 🧊
colorFrom: blue
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
short_description: AI-supported LPR audit of Liebherr retailer webshops
---

HeLPR: audits retailer webshops against Liebherr's LPR Online criteria (HNU Winter School 2026, Liebherr challenge).
The Space starts with a demo snapshot of real audits; it resets to that snapshot when the Space restarts.
"""


def files() -> list[str]:
    out = []
    for p in ROOT.rglob("*"):
        if not p.is_file():
            continue
        rel = p.relative_to(ROOT).as_posix()
        if any(fnmatch.fnmatch(rel, a) for a in ALLOW) and not any(fnmatch.fnmatch(rel, i) for i in IGNORE):
            out.append(rel)
    return sorted(out)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("space", help="e.g. yourname/helpr")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    fs = files()
    if not any(f.startswith("app/demo/") for f in fs):
        raise SystemExit("app/demo is missing: run app/backend/scripts/export_demo.py first.")
    size = sum((ROOT / f).stat().st_size for f in fs)
    print(f"{len(fs)} files, {size / 1e6:.1f} MB -> space {a.space}")
    if a.dry_run:
        for f in fs:
            if not f.startswith(("app/demo/artifacts/", "app/frontend/src/", "app/backend/lpr/")):
                print("  ", f)
        return

    from huggingface_hub import HfApi
    api = HfApi()
    api.upload_file(path_or_fileobj=SPACE_README.encode("utf-8"), path_in_repo="README.md", repo_id=a.space,
                    repo_type="space", commit_message="Space settings")
    api.upload_folder(folder_path=str(ROOT), repo_id=a.space, repo_type="space", allow_patterns=ALLOW,
                      ignore_patterns=IGNORE, commit_message="Deploy HeLPR")
    print(f"Uploaded. The Space builds now (about 5-10 min): https://huggingface.co/spaces/{a.space}")


if __name__ == "__main__":
    main()
