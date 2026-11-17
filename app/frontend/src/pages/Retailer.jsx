import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, reportUrl, reviewerName } from "../api.js";
import {
  BLOCKS, Bar, Button, Delta, Empty, HelpTip, LabelBadge, RetailerLogo, ScoreRing, ScorecardSkeleton, Skeleton,
  SourceTag, StatusPill, fmtDate, scoreColor, useToast,
} from "../components/ui.jsx";
import { useT } from "../prefs.jsx";

const BLOCK_WEIGHT = { visibility: "×3", services: "×2", advice: "×1" };
const SCORE_TIP = "Weighted share of passed checks. Visibility counts ×3, Services ×2, Advice ×1; within a block, high-priority criteria count more. Checks that need a human are left out.";

export default function Retailer({ refreshKey, onRunAudit }) {
  const t = useT();
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const runId = params.get("run");
  const nav = useNavigate();
  const [retailers, setRetailers] = useState([]);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("criteria");

  useEffect(() => {
    api.retailers().then((rs) => {
      const blocked = (r) => Boolean(r.access_note || r.latest_run?.blocked);
      rs = [...rs].sort((a, b) => blocked(a) - blocked(b));  // blocked shops last
      setRetailers(rs);
      if (!id && rs.length) {
        const first = rs.find((r) => r.latest_run && !r.latest_run.blocked) || rs[0];
        nav(`/retailers/${first.id}`, { replace: true });
      }
    });
  }, [refreshKey]);

  const load = () => id && api.retailerOverview(id, runId).then(setData);
  useEffect(() => { setData(null); load(); }, [id, runId, refreshKey]);

  const selectRun = (rid) => setParams(rid ? { run: String(rid) } : {});

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {retailers.length === 0 && [0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-28 rounded-lg" />)}
        {retailers.map((r) => {
          const active = String(r.id) === String(id);
          const s = r.latest_run?.lpr_score;
          return (
            <button key={r.id} onClick={() => nav(`/retailers/${r.id}`)}
              className={`inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${active ? "bg-[#0F172A] text-white border-[#0F172A]" : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"}`}>
              <RetailerLogo retailer={r} className="w-5 h-5" />
              {r.name}
              <span className="tabular px-1.5 rounded" style={{ background: active ? "rgba(255,255,255,.12)" : "var(--color-slate-100)", color: active ? "#fff" : scoreColor(s) }}>
                {s != null ? `${Math.round(s)}%` : r.access_note ? t("blocked") : "–"}
              </span>
            </button>
          );
        })}
      </div>

      {!data ? (
        <ScorecardSkeleton />
      ) : !data.latest_run ? (
        <Empty title={t("{name} has not been audited yet", { name: data.retailer.name })}>
          <div className="mt-3"><Button onClick={() => onRunAudit([data.retailer.id])}>{t("Audit {name}", { name: data.retailer.name })}</Button></div>
        </Empty>
      ) : data.latest_run.blocked ? (
        <Empty title={t("{name} blocks automated checks", { name: data.retailer.name })}>
          <p>{t("Needs a manual assessment.")}</p>
        </Empty>
      ) : (
        <>
          {!data.is_latest && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
              <span>{t("You are viewing an older audit from {date}.", { date: fmtDate(data.latest_run.finished_at) })}</span>
              <Button variant="ghost" onClick={() => selectRun(null)}>{t("Show latest")}</Button>
            </div>
          )}
          <Hero data={data} onRunAudit={onRunAudit} onSelectRun={selectRun} />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-8 card overflow-hidden">
              <Tabs tab={tab} setTab={setTab} data={data} />
              {tab === "criteria" && <CriteriaTab data={data} onChanged={load} />}
              {tab === "risks" && <RisksTab data={data} />}
              {tab === "assortment" && <AssortmentTab data={data} />}
              {tab === "todo" && <TodoTab run={data.latest_run} onChanged={load} />}
            </div>
            <div className="lg:col-span-4 space-y-5">
              <TrendCard history={data.history} currentRun={data.latest_run.id} onSelect={selectRun} />
              <SimulatorCard retailer={data.retailer} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ hero */
function Hero({ data, onRunAudit, onSelectRun }) {
  const t = useT();
  const r = data.retailer;
  const run = data.latest_run;
  const domain = r.base_url.replace(/^https?:\/\//, "");
  const audits = [...data.history].reverse();
  return (
    <section className="card p-5 sm:p-6">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-center">
        <div className="xl:col-span-5 flex items-start gap-4">
          <RetailerLogo retailer={r} className="w-14 h-14" />
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{r.name}</h1>
              <a href={r.base_url} target="_blank" rel="noreferrer"
                className="px-2 py-0.5 rounded-md text-xs font-medium bg-sky-50 text-brand border border-sky-200 hover:bg-sky-100">{domain} ↗</a>
              {run.brand_page_url && (
                <a href={run.brand_page_url} target="_blank" rel="noreferrer"
                  className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100">{t("Brand page")} ↗</a>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 tabular">
              <label className="flex items-center gap-1.5">{t("Audit")}
                <select value={run.id} onChange={(e) => onSelectRun(Number(e.target.value) === audits[0]?.run_id ? null : e.target.value)}
                  className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5 cursor-pointer">
                  {audits.map((a) => <option key={a.run_id} value={a.run_id}>{fmtDate(a.date)}{a.lpr_score != null ? ` · ${Math.round(a.lpr_score)}%` : ""}</option>)}
                </select>
              </label>
              <span>{t("Decided")} <b className="text-slate-800">{run.checked_count} / {run.applicable_count}</b> {t("checks")}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {["1", "2", "3"].map((sk) => {
                const v = run.sk_scores?.[sk];
                return (
                  <span key={sk} className="px-2 py-0.5 rounded-md text-xs font-semibold border border-slate-200 bg-slate-50 tabular">
                    SK{sk} <span style={{ color: scoreColor(v?.score) }}>{v?.score != null ? `${Math.round(v.score)}%` : "–"}</span>
                  </span>
                );
              })}
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="ghost" onClick={() => onRunAudit([r.id])}>{t("Re-audit")}</Button>
              <a href={reportUrl(run.id, "pdf")}><Button variant="ghost">{t("PDF report")}</Button></a>
              <a href={reportUrl(run.id, "xlsx")}><Button variant="ghost">Excel</Button></a>
            </div>
          </div>
        </div>
        <div className="xl:col-span-3 xl:px-5 xl:border-x border-slate-200 flex items-center justify-center gap-4">
          <ScoreRing score={run.lpr_score} label={t("LPR score")} />
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5"><LabelBadge label={run.status_label} /><HelpTip text={t(SCORE_TIP)} /></div>
            <Delta value={run.lpr_score_change} />
          </div>
        </div>
        <div className="xl:col-span-4 grid grid-cols-2 gap-2.5">
          {["visibility", "services", "advice", "ai_readiness"].map((b) => {
            const s = run.block_scores?.[b];
            return (
              <div key={b} className="rounded-lg border border-slate-200 p-3"
                title={s ? t("{p} passed · {f} failed · {u} need a human", { p: s.passed, f: s.failed, u: s.unchecked }) : ""}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold">{t(BLOCKS[b].label)}</span>
                  <span className="flex items-baseline gap-1.5">
                    {BLOCK_WEIGHT[b] && <span className="text-[10px] font-semibold text-slate-400">{BLOCK_WEIGHT[b]}</span>}
                    <span className="text-sm font-bold tabular" style={{ color: scoreColor(s?.score) }}>{s?.score != null ? `${Math.round(s.score)}%` : "–"}</span>
                  </span>
                </div>
                <Bar value={s?.score} className="mt-2" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ tabs */
function Tabs({ tab, setTab, data }) {
  const t = useT();
  const items = [
    ["criteria", t("Criteria")],
    ["risks", `${t("Return risks")} (${data.return_risks.length})`],
    ["assortment", t("Assortment")],
    ["todo", `${t("To-do")} (${data.missing.length})`],
  ];
  return (
    <div className="px-4 pt-3 bg-slate-50/80 border-b border-slate-200 flex flex-wrap gap-1">
      {items.map(([k, label]) => (
        <button key={k} onClick={() => setTab(k)}
          className={`px-3.5 py-2.5 text-xs border-b-2 rounded-t-lg cursor-pointer transition ${tab === k ? "border-brand text-brand bg-white font-semibold" : "border-transparent text-slate-600 hover:text-slate-900 font-medium"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

function CriteriaTab({ data, onChanged }) {
  const t = useT();
  const [filter, setFilter] = useState("fail");
  const [block, setBlock] = useState("all");
  const [open, setOpen] = useState(null);
  const rows = useMemo(() => {
    const all = [
      ...data.missing.map((x) => ({ ...x, group: "fail" })),
      ...data.needs_human.map((x) => ({ ...x, group: "needs_human" })),
      ...data.good.map((x) => ({ ...x, group: "pass" })),
    ];
    return all.filter((x) => (filter === "all" || x.group === filter) && (block === "all" || x.criterion.block === block));
  }, [data, filter, block]);
  const counts = { fail: data.missing.length, needs_human: data.needs_human.length, pass: data.good.length };
  counts.all = counts.fail + counts.needs_human + counts.pass;
  const filters = [["fail", "Failed"], ["needs_human", "Needs human"], ["pass", "Passed"], ["all", "All"]];

  return (
    <div>
      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
        <div className="inline-flex p-1 rounded-lg bg-slate-100 border border-slate-200/80 gap-1">
          {filters.map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${filter === k ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-800"}`}>
              {t(label)} <span className="text-slate-400 tabular">{counts[k]}</span>
            </button>
          ))}
        </div>
        <select value={block} onChange={(e) => setBlock(e.target.value)} className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 cursor-pointer">
          <option value="all">{t("All blocks")}</option>
          {Object.entries(BLOCKS).map(([k, v]) => <option key={k} value={k}>{t(v.label)}</option>)}
        </select>
      </div>
      {rows.length === 0 && <p className="p-6 text-sm text-slate-500 text-center">{t("Nothing here.")}</p>}
      <div className="divide-y divide-slate-100">
        {rows.map((row) => {
          const c = row.criterion;
          const isOpen = open === c.id;
          const total = row.passed + row.failed;
          return (
            <div key={c.id}>
              <button onClick={() => setOpen(isOpen ? null : c.id)} className="w-full text-left px-4 py-3 hover:bg-slate-50 cursor-pointer grid grid-cols-12 gap-3 items-center">
                <div className="col-span-12 sm:col-span-7 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-semibold text-slate-400">{c.code}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{t(BLOCKS[c.block]?.label)}</span>
                    {c.return_risk && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-semibold">{t("return risk")}</span>}
                  </div>
                  <p className="text-sm font-semibold mt-0.5">{c.title}</p>
                </div>
                <div className="col-span-6 sm:col-span-3 text-xs text-slate-500 tabular">
                  {total ? t("{p} / {n} passed", { p: row.passed, n: total }) : "–"}
                </div>
                <div className="col-span-6 sm:col-span-2 flex justify-end items-center gap-2">
                  <StatusPill status={row.group} />
                  <span className="text-slate-400 text-xs">{isOpen ? "▲" : "▼"}</span>
                </div>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 space-y-2 bg-slate-50/60">
                  {row.verdicts.map((v) => <VerdictCard key={v.id} v={v} onChanged={onChanged} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VerdictCard({ v, onChanged }) {
  const t = useT();
  const toast = useToast();
  const [mode, setMode] = useState(null); // "override" | "feedback"
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const quotes = v.evidence?.quotes || v.evidence?.vision_quotes || [];
  const facts = Object.entries(v.evidence || {}).filter(([k]) => !["quotes", "vision_quotes", "ai_verdict", "judge", "escalated", "vision_verdict"].includes(k));

  const act = async (fn, msg) => {
    setBusy(true);
    try {
      await fn();
      toast(msg);
      setMode(null);
      setComment("");
      onChanged();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const override = (status) => act(() => api.overrideVerdict(v.id, { override_status: status, override_by: reviewerName() || "reviewer", override_comment: comment || null }),
    t(status === "pass" ? "Marked as passed" : "Marked as failed"));
  const sendFeedback = (status) => act(() => api.feedback(v.id, { author: reviewerName() || "reviewer", comment, corrected_status: status }), t("Feedback saved, the AI will use it next time"));

  return (
    <div className="card p-3 flex flex-col md:flex-row gap-3">
      {v.screenshot_url && (
        <a href={v.screenshot_url} target="_blank" rel="noreferrer" className="shrink-0">
          <img src={v.screenshot_url} alt={t("Screenshot of the checked page")} className="screenshot w-full md:w-44 h-28 object-cover object-top rounded-md border border-slate-200" />
        </a>
      )}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold">{v.product ? `${v.product.model} · SK${v.product.sk}` : t("Shop-wide")}</span>
          <StatusPill status={v.status} />
          <SourceTag source={v.source} />
          {v.confidence != null && v.source === "ai" && <span className="text-[10px] text-slate-400 tabular">{t("{n}% sure", { n: Math.round(v.confidence * 100) })}</span>}
          {v.overridden && <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 font-semibold">{t("changed by {name}", { name: v.override_by })}</span>}
        </div>
        <p className="text-sm text-slate-700">{v.reasoning}</p>
        {quotes.length > 0 && <ul className="text-xs text-slate-500 list-disc pl-4 space-y-0.5">{quotes.slice(0, 4).map((q, i) => <li key={i}>{q}</li>)}</ul>}
        {facts.length > 0 && (
          <details className="text-[11px] text-slate-500">
            <summary className="cursor-pointer select-none">{t("Details")}</summary>
            <pre className="mt-1 whitespace-pre-wrap break-all bg-slate-50 rounded p-2">{JSON.stringify(Object.fromEntries(facts), null, 1)}</pre>
          </details>
        )}
        {v.override_comment && <p className="text-xs text-violet-700">“{v.override_comment}”</p>}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Button variant="subtle" onClick={() => setMode(mode === "override" ? null : "override")}>{t("Change result")}</Button>
          {v.source === "ai" && <Button variant="subtle" onClick={() => setMode(mode === "feedback" ? null : "feedback")}>{t("Teach the AI")}</Button>}
        </div>
        {mode && (
          <div className="space-y-2 pt-1">
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2}
              placeholder={t(mode === "feedback" ? "What should the AI do differently?" : "Reason (optional)")}
              className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-sky-200" />
            <div className="flex gap-1.5">
              {mode === "override" ? (
                <>
                  <Button disabled={busy} onClick={() => override("pass")}>{t("Pass")}</Button>
                  <Button disabled={busy} variant="dark" onClick={() => override("fail")}>{t("Fail")}</Button>
                </>
              ) : (
                <>
                  <Button disabled={busy || !comment} onClick={() => sendFeedback("pass")}>{t("Should pass")}</Button>
                  <Button disabled={busy || !comment} variant="dark" onClick={() => sendFeedback("fail")}>{t("Should fail")}</Button>
                  <Button disabled={busy || !comment} variant="ghost" onClick={() => sendFeedback(null)}>{t("Note only")}</Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RisksTab({ data }) {
  const t = useT();
  if (!data.return_risks.length) return <p className="p-6 text-sm text-slate-500 text-center">{t("No return risks found.")}</p>;
  return (
    <div className="p-4">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
          <th className="py-2 pr-3">{t("Product")}</th><th className="py-2 pr-3">{t("Missing")}</th><th className="py-2">{t("Finding")}</th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {data.return_risks.map((r) => (
            <tr key={r.verdict_id}><td className="py-2 pr-3 font-semibold whitespace-nowrap">{r.product || "–"}</td>
              <td className="py-2 pr-3">{r.criterion}</td><td className="py-2 text-slate-600">{r.reasoning}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AssortmentTab({ data }) {
  const t = useT();
  const l = data.listing;
  if (!l) return <p className="p-6 text-sm text-slate-500 text-center">{t("Not counted yet. Run an audit with “Count listed & available models”.")}</p>;
  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[["Reference models", l.reference_count], ["Listed", l.listed_count], ["Available", l.available_count]].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-slate-200 p-3"><p className="text-[11px] text-slate-500">{t(k)}</p><p className="text-xl font-bold tabular">{v ?? "?"}</p></div>
        ))}
      </div>
      <p className="text-[11px] text-slate-400">{t("Counted {date}", { date: fmtDate(l.counted_at) })}</p>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
          <th className="py-2">{t("Model")}</th><th>SK</th><th>{t("Listed")}</th><th>{t("Available")}</th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {l.items.map((it) => (
            <tr key={it.model}>
              <td className="py-1.5">{it.url ? <a href={it.url} target="_blank" rel="noreferrer" className="text-brand hover:underline">{it.model}</a> : it.model}</td>
              <td>{it.sk}</td><td>{it.listed ? "✓" : "–"}</td><td>{it.available == null ? "?" : it.available ? "✓" : "✗"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TodoTab({ run, onChanged }) {
  const t = useT();
  const toast = useToast();
  const [items, setItems] = useState(null);
  const load = () => api.todo(run.id).then(setItems);
  useEffect(() => { load(); }, [run.id]);

  const fixed = async (item) => {
    try {
      await api.markFixed(run.id, item.criterion.id, reviewerName() || "reviewer");
      toast(t("“{title}” marked as fixed", { title: item.criterion.title }));
      load();
      onChanged();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  if (!items) return <div className="p-4 space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>;
  if (!items.length) return <p className="p-6 text-sm text-slate-500 text-center">{t("Nothing to fix.")}</p>;
  return (
    <div className="p-4 space-y-3">
      <div className="flex justify-end"><a href={reportUrl(run.id, "pdf")}><Button>{t("Download PDF")}</Button></a></div>
      {items.map((item, i) => (
        <div key={item.criterion.id} className="rounded-lg border border-slate-200 p-3 flex gap-3 items-start">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{i + 1}. {item.criterion.title}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${item.criterion.priority === "high" ? "bg-red-50 text-red-700" : item.criterion.priority === "medium" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{t(item.criterion.priority)}</span>
              {item.due_date && <span className="text-[11px] text-slate-500 tabular">{t("due {date}", { date: item.due_date })}</span>}
            </div>
            <p className="text-xs text-slate-500 mt-1">{item.products.filter(Boolean).join(", ") || t("Shop-wide")}</p>
            <p className="text-sm mt-1.5">{item.suggested_fix}</p>
          </div>
          <Button variant="ghost" onClick={() => fixed(item)}>✓ {t("Mark as fixed")}</Button>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ right column */
function TrendCard({ history, currentRun, onSelect }) {
  const t = useT();
  const pts = history.filter((h) => h.lpr_score != null);
  const W = 320, H = 150, padX = 22, top = 16, bottom = 34;
  const x = (i) => padX + (pts.length <= 1 ? (W - 2 * padX) / 2 : (i * (W - 2 * padX)) / (pts.length - 1));
  const y = (v) => top + (1 - (Math.max(40, v) - 40) / 60) * (H - top - bottom);
  const day = (d) => new Date(d.endsWith("Z") || d.includes("+") ? d : d + "Z");
  const label = (d) => day(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  const time = (d) => day(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const step = Math.max(1, Math.ceil(pts.length / 5));
  return (
    <div className="card p-4">
      <h2 className="text-sm font-bold flex items-center gap-1.5">{t("Score trend")} <HelpTip text={t("Click a point to open that audit.")} /></h2>
      {pts.length === 0 ? <p className="text-xs text-slate-400 mt-4">{t("No data yet.")}</p> : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-2">
          {[60, 80, 100].map((g) => (
            <g key={g}>
              <line x1={padX} x2={W - padX} y1={y(g)} y2={y(g)} stroke="var(--color-slate-200)" strokeDasharray="3 3" />
              <text x={W - padX + 2} y={y(g) + 3} fontSize="8" fill="var(--color-slate-400)">{g}</text>
            </g>
          ))}
          <polyline fill="none" stroke="#0284C7" strokeWidth="2" points={pts.map((p, i) => `${x(i)},${y(p.lpr_score)}`).join(" ")} />
          {pts.map((p, i) => {
            const cur = p.run_id === currentRun;
            return (
              <g key={p.run_id} onClick={() => onSelect(p.run_id)} style={{ cursor: "pointer" }}>
                <title>{`${label(p.date)} ${time(p.date)} · ${Math.round(p.lpr_score)}%`}</title>
                <circle cx={x(i)} cy={y(p.lpr_score)} r="10" fill="transparent" />
                <circle cx={x(i)} cy={y(p.lpr_score)} r={cur ? 5 : 3.5} fill={cur ? "#0284C7" : "var(--color-slate-50)"} stroke="#0284C7" strokeWidth="2" />
                <text x={x(i)} y={y(p.lpr_score) - 9} textAnchor="middle" fontSize="9" fontWeight={cur ? 700 : 400} fill="var(--color-slate-600)">{Math.round(p.lpr_score)}%</text>
                {(i % step === 0 || i === pts.length - 1) && (
                  <>
                    <text x={x(i)} y={H - 18} textAnchor="middle" fontSize="8" fill="var(--color-slate-500)">{label(p.date)}</text>
                    <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="7.5" fill="var(--color-slate-400)">{time(p.date)}</text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

function SimulatorCard({ retailer }) {
  const t = useT();
  const [q, setQ] = useState("Does this fridge-freezer fit into a niche 60 cm wide and 186 cm high? Does it have a handle?");
  const [answer, setAnswer] = useState(null);
  const [busy, setBusy] = useState(false);
  const ask = async () => {
    setBusy(true);
    setAnswer(null);
    try {
      setAnswer((await api.simulate({ retailer_id: retailer.id, question: q })).answer);
    } catch (e) {
      setAnswer(`${t("Error")}: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="card p-4 space-y-2.5">
      <h2 className="text-sm font-bold flex items-center gap-1.5">{t("AI shopper test")}
        <HelpTip text={t("Ask like a shopper. The AI answers using only {name}'s audited pages, showing whether AI assistants can recommend Liebherr products from this shop.", { name: retailer.name })} />
      </h2>
      <textarea value={q} onChange={(e) => setQ(e.target.value)} rows={3}
        className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-sky-200" />
      <Button onClick={ask} disabled={busy || !q}>{busy ? t("Asking…") : t("Ask")}</Button>
      {answer && <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 whitespace-pre-wrap">{answer}</div>}
    </div>
  );
}
