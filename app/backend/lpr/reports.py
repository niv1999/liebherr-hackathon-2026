"""Retailer reports: Excel (all verdicts + to-do list) and PDF (score, to-do list with deadlines and evidence)."""
from __future__ import annotations

import base64
import html
import io
from pathlib import Path

import pandas as pd
from sqlmodel import Session

from .models import AuditRun, Retailer
from .services import run_summary, run_verdicts, todo_list


def excel_report(s: Session, run: AuditRun) -> bytes:
    verdicts = run_verdicts(s, run.id)
    rows = [{
        "Product": v["product"]["model"] if v["product"] else "", "SK": v["product"]["sk"] if v["product"] else "",
        "Code": v["criterion"]["code"], "Criterion": v["criterion"]["title"], "Block": v["criterion"]["block"],
        "Priority": v["criterion"]["priority"], "Return risk": "yes" if v["criterion"]["return_risk"] else "",
        "Result": v["status"], "Decided by": v["source"], "Overridden by": v["override_by"] or "",
        "Reason": v["reasoning"], "Suggested fix": v["suggested_fix"] or "", "Due": v["due_date"] or "",
    } for v in verdicts if v["criterion"]]
    todo = [{"Priority": t["criterion"]["priority"], "Code": t["criterion"]["code"], "Task": t["criterion"]["title"],
             "Products": ", ".join(p for p in t["products"] if p), "Suggested fix": t["suggested_fix"],
             "Due": t["due_date"], "Return risk": "yes" if t["criterion"]["return_risk"] else ""} for t in todo_list(s, run.id)]
    summ = run_summary(run)
    summary = pd.DataFrame([
        ("Retailer", s.get(Retailer, run.retailer_id).name), ("Audit", run.id), ("Finished", str(run.finished_at)),
        ("LPR score %", summ["lpr_score"]), ("AI-readiness %", summ["ai_readiness_score"]),
        ("Checked automatically", f"{summ['checked_count']} of {summ['applicable_count']}"),
        ("Return risks", summ["return_risk_count"]), ("Listed models", summ["listed_count"]),
        ("Available models", summ["available_count"]),
    ], columns=["Item", "Value"])
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as xw:
        summary.to_excel(xw, sheet_name="Summary", index=False)
        pd.DataFrame(todo).to_excel(xw, sheet_name="To-do list", index=False)
        pd.DataFrame(rows).to_excel(xw, sheet_name="All checks", index=False)
        for ws in xw.book.worksheets:
            for col in ws.columns:
                ws.column_dimensions[col[0].column_letter].width = min(60, max(10, max(len(str(c.value or "")) for c in col) + 2))
    return buf.getvalue()


def _img(path: str | None) -> str:
    if not path or not Path(path).exists():
        return ""
    data = base64.b64encode(Path(path).read_bytes()).decode()
    return f'<img src="data:image/jpeg;base64,{data}">'


def report_html(s: Session, run: AuditRun) -> str:
    e = html.escape
    r = s.get(Retailer, run.retailer_id)
    summ = run_summary(run)
    todo = todo_list(s, run.id)
    shots = {v["screenshot_url"]: v for v in run_verdicts(s, run.id)}
    items = []
    for i, t in enumerate(todo, 1):
        c = t["criterion"]
        ev = t["evidence"][0] if t["evidence"] else {}
        items.append(f"""<div class="item"><h3>{i}. {e(c['title'])} <span class="pr {c['priority']}">{c['priority']}</span>
        {'<span class="rr">return risk</span>' if c['return_risk'] else ''}</h3>
        <p><b>Products:</b> {e(', '.join(p for p in t['products'] if p))} &nbsp; <b>Due:</b> {e(t['due_date'] or '-')}</p>
        <p><b>Finding:</b> {e(ev.get('reasoning') or '')}</p>
        <p><b>How to fix:</b> {e(t['suggested_fix'] or '')}</p>
        {('<p><b>Official Liebherr assets:</b> ' + ' · '.join(f'<a href="{e(a["url"])}">{e(a["label"])}</a>' for a in t.get('assets') or []) + '</p>') if t.get('assets') else ''}</div>""")
    first_shot = next((v for v in shots.values() if v["screenshot_url"]), None)
    shot_path = None
    if first_shot:
        from .models import Verdict
        shot_path = s.get(Verdict, first_shot["id"]).screenshot_path
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
    body{{font-family:Segoe UI,Arial,sans-serif;color:#14202B;font-size:11pt;margin:0}}
    h1{{font-size:22pt;margin:0 0 4px}} h2{{font-size:14pt;border-bottom:2px solid #d0d7de;padding-bottom:4px;margin-top:22px}}
    h3{{font-size:11.5pt;margin:0 0 4px}} .muted{{color:#5B6573}}
    .kpis{{display:flex;gap:12px;margin:14px 0}} .kpi{{flex:1;background:#F1F3F6;border-radius:8px;padding:10px 12px}}
    .kpi b{{display:block;font-size:18pt}} .item{{border:1px solid #DCE1E7;border-radius:8px;padding:10px 12px;margin:8px 0;page-break-inside:avoid}}
    .item p{{margin:3px 0}} .pr{{font-size:8.5pt;padding:1px 8px;border-radius:10px;background:#E4E7EC}}
    .pr.high{{background:#FADDD6;color:#9E2F1C}} .pr.medium{{background:#FBEBC8;color:#6E4A00}}
    .rr{{font-size:8.5pt;padding:1px 8px;border-radius:10px;background:#FBE8D6;color:#8A4A10}}
    img{{max-width:100%;border:1px solid #DCE1E7;border-radius:6px}}
    </style></head><body>
    <p class="muted">LPR Online assessment · Liebherr-Hausgeräte</p>
    <h1>{e(r.name)}: webshop quality report</h1>
    <p class="muted">Audit #{run.id} · {e(str(run.finished_at)[:16] if run.finished_at else '')}</p>
    <div class="kpis"><div class="kpi">LPR score<b>{summ['lpr_score'] if summ['lpr_score'] is not None else '-'}%</b></div>
    <div class="kpi">AI-readiness<b>{summ['ai_readiness_score'] if summ['ai_readiness_score'] is not None else '-'}%</b></div>
    <div class="kpi">Open tasks<b>{len(todo)}</b></div><div class="kpi">Return risks<b>{summ['return_risk_count']}</b></div></div>
    <p class="muted">{summ['checked_count']} of {summ['applicable_count']} checks decided automatically; the rest need a manual check.</p>
    <h2>To-do list</h2>{''.join(items) or '<p>No open tasks. All checked criteria are fulfilled.</p>'}
    {('<h2>Evidence example</h2>' + _img(shot_path)) if shot_path else ''}
    </body></html>"""


def pdf_report(s: Session, run: AuditRun) -> bytes:
    from playwright.sync_api import sync_playwright

    doc = report_html(s, run)
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page()
        page.set_content(doc, wait_until="load")
        pdf = page.pdf(format="A4", margin={"top": "16mm", "bottom": "16mm", "left": "14mm", "right": "14mm"},
                       print_background=True)
        b.close()
    return pdf
