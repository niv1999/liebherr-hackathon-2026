import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { Bar, Button, Delta, Empty, LabelBadge, Monogram, fmtDate } from "../components/ui.jsx";

function Kpi({ label, value, hint }) {
  return (
    <div className="card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-2xl font-bold tracking-tight mt-1 tabular">{value}</p>
      {hint && <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>}
    </div>
  );
}

export default function Overview({ refreshKey, onRunAudit }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const nav = useNavigate();

  const load = () => api.overview().then(setData).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, [refreshKey]);
  // While audits run, refresh every 5 s
  const running = data?.retailers.some((r) => r.running);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [running]);

  if (error) return <Empty title="Backend not reachable">Start it with <code>uvicorn lpr.api:app --app-dir app/backend --port 8000</code> ({error})</Empty>;
  if (!data) return <p className="text-sm text-slate-500">Loading…</p>;
  const k = data.kpis;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Retailer overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            How well each retailer's webshop meets Liebherr's LPR Online criteria. Freestanding fridge-freezers · latest audit per retailer.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Average LPR score" value={k.average_lpr_score == null ? "–" : `${k.average_lpr_score}%`} hint="weighted: Visibility > Services > Advice" />
        <Kpi label="Checks passed" value={`${k.criteria_passed} / ${k.criteria_checked}`} hint="decided automatically" />
        <Kpi label="Need a human" value={k.needs_human} hint="not visible online or AI unsure" />
        <Kpi label="AI-readiness (avg)" value={k.average_ai_readiness == null ? "–" : `${k.average_ai_readiness}%`} hint="ready for ChatGPT & co.?" />
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <h2 className="text-sm font-bold">Ranking</h2>
          <span className="text-[11px] text-slate-500">Click a retailer for its scorecard</span>
        </div>
        <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
          <span className="col-span-3">Retailer</span>
          <span className="col-span-3">LPR score</span>
          <span className="col-span-2">AI-ready</span>
          <span className="col-span-2">Return risks</span>
          <span className="col-span-2 text-right">Status</span>
        </div>
        <div className="divide-y divide-slate-100">
          {data.retailers.map(({ retailer, latest_run: run, running: live }) => (
            <div key={retailer.id} onClick={() => nav(`/retailers/${retailer.id}`)}
              className="grid grid-cols-1 md:grid-cols-12 gap-3 px-5 py-3.5 items-center hover:bg-slate-50 cursor-pointer">
              <div className="md:col-span-3 flex items-center gap-3 min-w-0">
                <Monogram name={retailer.name} className="w-9 h-9 text-xs rounded-xl" />
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{retailer.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{run ? `Audited ${fmtDate(run.finished_at)}` : "Not audited yet"}</p>
                </div>
              </div>
              <div className="md:col-span-3 flex items-center gap-3">
                <span className="text-sm font-bold w-12 tabular">{run?.lpr_score != null ? `${Math.round(run.lpr_score)}%` : "–"}</span>
                <Bar value={run?.lpr_score} className="max-w-40" />
                <Delta value={run?.lpr_score_change} />
              </div>
              <div className="md:col-span-2 text-sm tabular">{run?.ai_readiness_score != null ? `${Math.round(run.ai_readiness_score)}%` : "–"}</div>
              <div className="md:col-span-2 text-sm tabular">
                {run && !run.blocked ? (
                  <span className={run.return_risk_count ? "text-red-600 font-semibold" : "text-slate-500"}>{run.return_risk_count}</span>
                ) : "–"}
              </div>
              <div className="md:col-span-2 flex md:justify-end">
                {live ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-sky-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" /> {live.status === "queued" ? "Queued" : "Auditing…"}
                  </span>
                ) : (
                  <LabelBadge label={run ? run.status_label : retailer.access_note ? "Blocked · manual assessment" : "Not audited"} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {data.retailers.every((r) => !r.latest_run) && (
        <Empty title="No audits yet">
          <div className="mt-3"><Button onClick={() => onRunAudit()}>Run the first audit</Button></div>
        </Empty>
      )}
    </div>
  );
}
