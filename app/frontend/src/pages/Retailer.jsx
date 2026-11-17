import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, reportUrl, reviewerName } from "../api.js";
import {
  BLOCKS, Bar, Button, Delta, Empty, HelpTip, LabelBadge, RetailerLogo, ScoreRing, SourceTag, StatusPill, fmtDate,
  scoreColor, useToast,
} from "../components/ui.jsx";

const BLOCK_WEIGHT = { visibility: "×3", services: "×2", advice: "×1" };
const SCORE_TIP = "Weighted share of passed checks. Visibility counts ×3, Services ×2, Advice ×1; within a block, high-priority criteria count more. Checks that need a human are left out.";

export default function Retailer({ refreshKey, onRunAudit }) {
  const { id } = useParams();
  const nav = useNavigate();
  const [retailers, setRetailers] = useState([]);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("criteria");

  useEffect(() => {
    api.retailers().then((rs) => {
      setRetailers(rs);
      if (!id && rs.length) {
        const first = rs.find((r) => r.latest_run && !r.latest_run.blocked) || rs[0];
        nav(`/retailers/${first.id}`, { replace: true });
      }
    });
  }, [refreshKey]);

  const load = () => id && api.retailerOverview(id).then(setData);
  useEffect(() => { setData(null); load(); }, [id, refreshKey]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {retailers.map((r) => {
          const active = String(r.id) === String(id);
          const s = r.latest_run?.lpr_score;
          return (
            <button key={r.id} onClick={() => nav(`/retailers/${r.id}`)}
              className={`inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${active ? "bg-ink text-white border-ink" : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"}`}>
              <RetailerLogo retailer={r} className="w-5 h-5" />
              {r.name}
              <span className="tabular px-1.5 rounded" style={{ background: active ? "rgba(255,255,255,.12)" : "#F1F5F9", color: active ? "#fff" : scoreColor(s) }}>
                {s != null ? `${Math.round(s)}%` : r.access_note ? "blocked" : "–"}
              </span>
            </button>
          );
        })}
      </div>

      {!data ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : !data.latest_run ? (
        <Empty title={`${data.retailer.name} has not been audited yet`}>
          <div className="mt-3"><Button onClick={() => onRunAudit([data.retailer.id])}>Audit {data.retailer.name}</Button></div>
        </Empty>
      ) : data.latest_run.blocked ? (
        <Empty title={`${data.retailer.name} blocks automated checks`}>
          <p>Needs a manual assessment.</p>
          <p className="text-xs text-slate-400 mt-1">{data.latest_run.progress}</p>
        </Empty>
      ) : (
        <>
          <Hero data={data} onRunAudit={onRunAudit} />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-8 card overflow-hidden">
              <Tabs tab={tab} setTab={setTab} data={data} />
              {tab === "criteria" && <CriteriaTab data={data} onChanged={load} />}
              {tab === "risks" && <RisksTab data={data} />}
              {tab === "assortment" && <AssortmentTab data={data} />}
              {tab === "todo" && <TodoTab run={data.latest_run} onChanged={load} />}
            </div>
            <div className="lg:col-span-4 space-y-5">
              <TrendCard history={data.history} />
              <SimulatorCard retailer={data.retailer} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ hero */
function Hero({ data, onRunAudit }) {
  const r = data.retailer;
  const run = data.latest_run;
  const domain = r.base_url.replace(/^https?:\/\//, "");
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
                  className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100">Brand page ↗</a>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 tabular">
              <span>Audited <b className="text-slate-800">{fmtDate(run.finished_at)}</b></span>
              <span>Decided <b className="text-slate-800">{run.checked_count} / {run.applicable_count}</b> checks</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {["1", "2", "3"].map((sk) => {
                const v = run.sk_scores?.[sk];
                return (
                  <span key={sk} className="px-2 py-0.5 rounded-md text-xs font-semibold border border-slate-200 bg-slate-50 tabular"
                    title={v ? `${v.products} product pages checked` : "No product checked in this class"}>
                    SK{sk} <span style={{ color: scoreColor(v?.score) }}>{v?.score != null ? `${Math.round(v.score)}%` : "–"}</span>
                  </span>
                );
              })}
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="ghost" onClick={() => onRunAudit([r.id])}>Re-audit</Button>
              <a href={reportUrl(run.id, "pdf")}><Button variant="ghost">PDF report</Button></a>
              <a href={reportUrl(run.id, "xlsx")}><Button variant="ghost">Excel</Button></a>
            </div>
          </div>
        </div>
        <div className="xl:col-span-3 xl:px-5 xl:border-x border-slate-200 flex items-center justify-center gap-4">
          <ScoreRing score={run.lpr_score} />
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5"><LabelBadge label={run.status_label} /><HelpTip text={SCORE_TIP} /></div>
            <Delta value={run.lpr_score_change} />
          </div>
        </div>
        <div className="xl:col-span-4 grid grid-cols-2 gap-2.5">
          {["visibility", "services", "advice", "ai_readiness"].map((b) => {
            const s = run.block_scores?.[b];
            return (
              <div key={b} className="rounded-lg border border-slate-200 p-3"
                title={s ? `${s.passed} passed · ${s.failed} failed · ${s.unchecked} need a human` : ""}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold">{BLOCKS[b].label}</span>
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
  const items = [
    ["criteria", "Criteria"],
    ["risks", `Return risks (${data.return_risks.length})`],
    ["assortment", "Assortment"],
    ["todo", `To-do (${data.missing.length})`],
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
              {label} <span className="text-slate-400 tabular">{counts[k]}</span>
            </button>
          ))}
        </div>
        <select value={block} onChange={(e) => setBlock(e.target.value)} className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 cursor-pointer">
          <option value="all">All blocks</option>
          {Object.entries(BLOCKS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      {rows.length === 0 && <p className="p-6 text-sm text-slate-500 text-center">Nothing here.</p>}
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
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{BLOCKS[c.block]?.label}</span>
                    {c.return_risk && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-semibold">return risk</span>}
                  </div>
                  <p className="text-sm font-semibold mt-0.5">{c.title}</p>
                </div>
                <div className="col-span-6 sm:col-span-3 text-xs text-slate-500 tabular">
                  {total ? `${row.passed} / ${total} passed` : "–"}
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
  const override = (status) => act(() => api.overrideVerdict(v.id, { override_status: status, override_by: reviewerName() || "reviewer", override_comment: comment || null }), `Marked as ${status}`);
  const sendFeedback = (status) => act(() => api.feedback(v.id, { author: reviewerName() || "reviewer", comment, corrected_status: status }), "Feedback saved, the AI will use it next time");

  return (
    <div className="card p-3 flex flex-col md:flex-row gap-3">
      {v.screenshot_url && (
        <a href={v.screenshot_url} target="_blank" rel="noreferrer" className="shrink-0">
          <img src={v.screenshot_url} alt="Screenshot of the checked page" className="w-full md:w-44 h-28 object-cover object-top rounded-md border border-slate-200" />
        </a>
      )}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold">{v.product ? `${v.product.model} · SK${v.product.sk}` : "Shop-wide"}</span>
          <StatusPill status={v.status} />
          <SourceTag source={v.source} />
          {v.confidence != null && v.source === "ai" && <span className="text-[10px] text-slate-400 tabular">{Math.round(v.confidence * 100)}% sure</span>}
          {v.overridden && <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 font-semibold">changed by {v.override_by}</span>}
        </div>
        <p className="text-sm text-slate-700">{v.reasoning}</p>
        {quotes.length > 0 && <ul className="text-xs text-slate-500 list-disc pl-4 space-y-0.5">{quotes.slice(0, 4).map((q, i) => <li key={i}>{q}</li>)}</ul>}
        {facts.length > 0 && (
          <details className="text-[11px] text-slate-500">
            <summary className="cursor-pointer select-none">Details</summary>
            <pre className="mt-1 whitespace-pre-wrap break-all bg-slate-50 rounded p-2">{JSON.stringify(Object.fromEntries(facts), null, 1)}</pre>
          </details>
        )}
        {v.override_comment && <p className="text-xs text-violet-700">“{v.override_comment}”</p>}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Button variant="subtle" onClick={() => setMode(mode === "override" ? null : "override")}>Change result</Button>
          {v.source === "ai" && <Button variant="subtle" onClick={() => setMode(mode === "feedback" ? null : "feedback")}>Teach the AI</Button>}
        </div>
        {mode && (
          <div className="space-y-2 pt-1">
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2}
              placeholder={mode === "feedback" ? "What should the AI do differently?" : "Reason (optional)"}
              className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-sky-200" />
            <div className="flex gap-1.5">
              {mode === "override" ? (
                <>
                  <Button disabled={busy} onClick={() => override("pass")}>Pass</Button>
                  <Button disabled={busy} variant="dark" onClick={() => override("fail")}>Fail</Button>
                </>
              ) : (
                <>
                  <Button disabled={busy || !comment} onClick={() => sendFeedback("pass")}>Should pass</Button>
                  <Button disabled={busy || !comment} variant="dark" onClick={() => sendFeedback("fail")}>Should fail</Button>
                  <Button disabled={busy || !comment} variant="ghost" onClick={() => sendFeedback(null)}>Note only</Button>
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
  if (!data.return_risks.length) return <p className="p-6 text-sm text-slate-500 text-center">No return risks found.</p>;
  return (
    <div className="p-4">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
          <th className="py-2 pr-3">Product</th><th className="py-2 pr-3">Missing</th><th className="py-2">Finding</th></tr></thead>
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
  const l = data.listing;
  if (!l) return <p className="p-6 text-sm text-slate-500 text-center">Not counted yet. Run an audit with “Count listed & available models”.</p>;
  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[["Reference models", l.reference_count], ["Listed", l.listed_count], ["Available", l.available_count]].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-slate-200 p-3"><p className="text-[11px] text-slate-500">{k}</p><p className="text-xl font-bold tabular">{v}</p></div>
        ))}
      </div>
      <p className="text-[11px] text-slate-400">Counted {fmtDate(l.counted_at)}</p>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200">
          <th className="py-2">Model</th><th>SK</th><th>Listed</th><th>Available</th></tr></thead>
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
  const toast = useToast();
  const [items, setItems] = useState(null);
  const load = () => api.todo(run.id).then(setItems);
  useEffect(() => { load(); }, [run.id]);

  const fixed = async (t) => {
    try {
      await api.markFixed(run.id, t.criterion.id, reviewerName() || "reviewer");
      toast(`“${t.criterion.title}” marked as fixed`);
      load();
      onChanged();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  if (!items) return <p className="p-6 text-sm text-slate-500">Loading…</p>;
  if (!items.length) return <p className="p-6 text-sm text-slate-500 text-center">Nothing to fix.</p>;
  return (
    <div className="p-4 space-y-3">
      <div className="flex justify-end"><a href={reportUrl(run.id, "pdf")}><Button>Download PDF</Button></a></div>
      {items.map((t, i) => (
        <div key={t.criterion.id} className="rounded-lg border border-slate-200 p-3 flex gap-3 items-start">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{i + 1}. {t.criterion.title}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${t.criterion.priority === "high" ? "bg-red-50 text-red-700" : t.criterion.priority === "medium" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{t.criterion.priority}</span>
              {t.due_date && <span className="text-[11px] text-slate-500 tabular">due {t.due_date}</span>}
            </div>
            <p className="text-xs text-slate-500 mt-1">{t.products.filter(Boolean).join(", ") || "Shop-wide"}</p>
            <p className="text-sm mt-1.5">{t.suggested_fix}</p>
          </div>
          <Button variant="ghost" onClick={() => fixed(t)}>✓ Mark as fixed</Button>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ right column */
function TrendCard({ history }) {
  const pts = history.filter((h) => h.lpr_score != null);
  const W = 300, H = 120, pad = 18;
  const x = (i) => pad + (pts.length <= 1 ? (W - 2 * pad) / 2 : (i * (W - 2 * pad)) / (pts.length - 1));
  const y = (v) => H - pad - ((Math.max(40, v) - 40) / 60) * (H - 2 * pad);
  return (
    <div className="card p-4">
      <h2 className="text-sm font-bold">Score trend</h2>
      {pts.length === 0 ? <p className="text-xs text-slate-400 mt-4">No data yet.</p> : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-2">
          {[60, 80, 100].map((g) => <line key={g} x1={pad} x2={W - pad} y1={y(g)} y2={y(g)} stroke="#E2E8F0" strokeDasharray="3 3" />)}
          <polyline fill="none" stroke="#0284C7" strokeWidth="2" points={pts.map((p, i) => `${x(i)},${y(p.lpr_score)}`).join(" ")} />
          {pts.map((p, i) => (
            <g key={p.run_id}>
              <circle cx={x(i)} cy={y(p.lpr_score)} r="3.5" fill="#0284C7" />
              <text x={x(i)} y={y(p.lpr_score) - 7} textAnchor="middle" fontSize="9" fill="#475569">{Math.round(p.lpr_score)}%</text>
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}

function SimulatorCard({ retailer }) {
  const [q, setQ] = useState("Passt dieser Kühlschrank in eine Nische von 60 cm Breite und 186 cm Höhe? Hat er einen Griff?");
  const [answer, setAnswer] = useState(null);
  const [busy, setBusy] = useState(false);
  const ask = async () => {
    setBusy(true);
    setAnswer(null);
    try {
      setAnswer((await api.simulate({ retailer_id: retailer.id, question: q })).answer);
    } catch (e) {
      setAnswer(`Error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="card p-4 space-y-2.5">
      <h2 className="text-sm font-bold flex items-center gap-1.5">AI shopper test
        <HelpTip text={`Ask like a shopper. The AI answers using only ${retailer.name}'s audited pages, showing whether AI assistants can recommend Liebherr products from this shop.`} />
      </h2>
      <textarea value={q} onChange={(e) => setQ(e.target.value)} rows={3}
        className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-sky-200" />
      <Button onClick={ask} disabled={busy || !q}>{busy ? "Asking…" : "Ask"}</Button>
      {answer && <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 whitespace-pre-wrap">{answer}</div>}
    </div>
  );
}
