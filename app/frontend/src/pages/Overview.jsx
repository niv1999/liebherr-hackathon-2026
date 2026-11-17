import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { Bar, Button, Delta, Empty, HelpTip, LabelBadge, RetailerLogo, fmtDate } from "../components/ui.jsx";

const TIPS = {
  score: "Average LPR score of all audited retailers. Each check counts by its weight: Visibility counts most, then Services, then Advice. Only checks the tool could decide are counted.",
  checks: "How many checks passed, out of all checks HeLPR decided automatically in the latest audits.",
  human: "Checks HeLPR can't decide alone: information that isn't visible online (e.g. staff training) or AI verdicts it isn't sure about. A Liebherr employee should review these.",
  ai: "How well retailers' pages can be read and recommended by AI assistants like ChatGPT: structured product data, specs as text, open to AI crawlers.",
  status: "On track: score 80% or more · Gaps to fix: 60–79% · Action needed: below 60% · Blocked: the shop blocks automated checks.",
};

function Kpi({ label, value, tip }) {
  return (
    <div className="card p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label} <HelpTip text={tip} />
      </p>
      <p className="text-2xl font-bold tracking-tight mt-1 tabular">{value}</p>
    </div>
  );
}

export default function Overview({ refreshKey, onRunAudit }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const nav = useNavigate();

  const load = () => api.overview().then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [refreshKey]);
  const running = data?.retailers.some((r) => r.running);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [running]);

  if (error) return <Empty title="Can't reach the HeLPR server">{error}</Empty>;
  if (!data) return <p className="text-sm text-slate-500">Loading…</p>;
  const k = data.kpis;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Overview</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Average LPR score" value={k.average_lpr_score == null ? "–" : `${k.average_lpr_score}%`} tip={TIPS.score} />
        <Kpi label="Checks passed" value={`${k.criteria_passed} / ${k.criteria_checked}`} tip={TIPS.checks} />
        <Kpi label="Needs human" value={k.needs_human} tip={TIPS.human} />
        <Kpi label="AI-readiness" value={k.average_ai_readiness == null ? "–" : `${k.average_ai_readiness}%`} tip={TIPS.ai} />
      </div>

      <div className="card overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-200 bg-slate-50/80">
          <span className="col-span-3">Retailer</span>
          <span className="col-span-3">LPR score</span>
          <span className="col-span-2">AI-ready</span>
          <span className="col-span-2">Return risks</span>
          <span className="col-span-2 flex justify-end items-center gap-1.5">Status <HelpTip text={TIPS.status} className="normal-case" /></span>
        </div>
        <div className="divide-y divide-slate-100">
          {data.retailers.map(({ retailer, latest_run: run, running: live }) => (
            <div key={retailer.id} onClick={() => nav(`/retailers/${retailer.id}`)}
              className="grid grid-cols-1 md:grid-cols-12 gap-3 px-5 py-3.5 items-center hover:bg-slate-50 cursor-pointer">
              <div className="md:col-span-3 flex items-center gap-3 min-w-0">
                <RetailerLogo retailer={retailer} />
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{retailer.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{run ? fmtDate(run.finished_at) : "Not audited"}</p>
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
        <Empty title="No audits yet"><div className="mt-3"><Button onClick={() => onRunAudit()}>Run the first audit</Button></div></Empty>
      )}
    </div>
  );
}
