import { useEffect, useState } from "react";
import { api, reviewerName, setReviewerName } from "../api.js";
import { Button, HelpTip, Switch, fmtDate, useToast } from "../components/ui.jsx";

const MODELS = {
  gemini: [["gemini-2.5-flash", "Gemini 2.5 Flash (free tier)"], ["gemini-2.5-pro", "Gemini 2.5 Pro"]],
  claude: [["claude-opus-5-5", "Claude Opus 5.5"], ["claude-sonnet-5-5", "Claude Sonnet 5.5"], ["claude-haiku-5-5", "Claude Haiku 5.5"]],
};
const AI_TIP = "The AI judge decides the subjective criteria (feature texts, premium look, AI shopper test). The key is stored only on this computer (app/.env) and never shown again.";

const card = "card p-5 space-y-3";
const h2 = "text-sm font-bold flex items-center gap-1.5";
const inputCls = "border border-slate-300 rounded-md px-2.5 py-1.5 text-sm";

export default function Settings() {
  const toast = useToast();
  const [schedule, setSchedule] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [ai, setAi] = useState(null);
  const [aiForm, setAiForm] = useState({ provider: "gemini", model: "", api_key: "" });
  const [name, setName] = useState(reviewerName());
  const [audits, setAudits] = useState([]);

  useEffect(() => {
    api.schedule().then(setSchedule);
    api.defaults().then(setDefaults);
    api.audits().then(setAudits);
    api.aiSettings().then((s) => { setAi(s); setAiForm({ provider: s.provider === "none" ? "gemini" : s.provider, model: s.model, api_key: "" }); });
  }, []);

  const run = async (fn, msg) => {
    try {
      const r = await fn();
      toast(msg);
      return r;
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const saveAi = async (provider) => {
    const r = await run(() => api.setAiSettings({ provider, model: provider === "none" ? null : aiForm.model, api_key: aiForm.api_key || null }),
      provider === "none" ? "AI judge turned off" : "AI judge saved");
    if (r) { setAi(r); setAiForm({ ...aiForm, api_key: "" }); }
  };
  const hasKey = ai && (aiForm.provider === "claude" ? ai.has_claude_key : ai.has_gemini_key);

  return (
    <div className="space-y-5 max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      {ai && (
        <section className={card}>
          <h2 className={h2}>AI judge <HelpTip text={AI_TIP} />
            <span className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full ${ai.available ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
              {ai.available ? `On · ${ai.model}` : "Off"}
            </span>
          </h2>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-slate-500">Provider
              <select value={aiForm.provider} onChange={(e) => setAiForm({ ...aiForm, provider: e.target.value, model: MODELS[e.target.value][0][0] })} className={`block mt-1 ${inputCls}`}>
                <option value="gemini">Google Gemini</option><option value="claude">Anthropic Claude</option>
              </select></label>
            <label className="text-xs text-slate-500">Model
              <select value={aiForm.model} onChange={(e) => setAiForm({ ...aiForm, model: e.target.value })} className={`block mt-1 ${inputCls}`}>
                {MODELS[aiForm.provider].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></label>
            <label className="text-xs text-slate-500 flex-1 min-w-48">API key
              <input type="password" value={aiForm.api_key} onChange={(e) => setAiForm({ ...aiForm, api_key: e.target.value })}
                placeholder={hasKey ? "•••••••• saved (leave empty to keep)" : "Paste key"} className={`block mt-1 w-full ${inputCls}`} /></label>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => saveAi(aiForm.provider)} disabled={!hasKey && !aiForm.api_key}>Save &amp; turn on</Button>
            {ai.available && <Button variant="ghost" onClick={() => saveAi("none")}>Turn off</Button>}
          </div>
        </section>
      )}

      {schedule && (
        <section className={card}>
          <h2 className={h2}>Automatic audits</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Switch checked={schedule.enabled} onChange={(v) => setSchedule({ ...schedule, enabled: v })} label="Audit all retailers every" />
            <input type="number" min="1" value={schedule.interval_days} onChange={(e) => setSchedule({ ...schedule, interval_days: Number(e.target.value) })} className={`w-16 ${inputCls}`} />
            <span className="text-sm">days</span>
            <Button onClick={async () => { const s = await run(() => api.setSchedule({ enabled: schedule.enabled, interval_days: schedule.interval_days }), "Schedule saved"); if (s) setSchedule(s); }}>Save</Button>
          </div>
          {schedule.next_run && <p className="text-xs text-slate-500">Next run {fmtDate(schedule.next_run)}</p>}
        </section>
      )}

      {defaults && (
        <section className={card}>
          <h2 className={h2}>Audits</h2>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2">Models per SK class
              <input type="number" min="1" max="10" value={defaults.samples_per_sk} onChange={(e) => setDefaults({ ...defaults, samples_per_sk: Number(e.target.value) })} className={`w-16 ${inputCls}`} /></label>
            <label className="flex items-center gap-2">Fix deadline (days)
              <input type="number" min="1" value={defaults.due_days} onChange={(e) => setDefaults({ ...defaults, due_days: Number(e.target.value) })} className={`w-16 ${inputCls}`} /></label>
            <Button onClick={() => run(() => api.setDefaults(defaults), "Audit settings saved")}>Save</Button>
          </div>
        </section>
      )}

      <section className={card}>
        <h2 className={h2}>Your name <HelpTip text="Shown next to results you change or AI feedback you give." /></h2>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Name" />
          <Button onClick={() => { setReviewerName(name); toast("Name saved"); }}>Save</Button>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200"><h2 className="text-sm font-bold">Audit history</h2></div>
        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
          {audits.map((a) => (
            <div key={a.id} className="px-5 py-2.5 grid grid-cols-12 gap-2 text-xs items-center">
              <span className="col-span-1 text-slate-400 tabular">#{a.id}</span>
              <span className="col-span-3 font-semibold">{a.retailer}</span>
              <span className="col-span-4 text-slate-500">{fmtDate(a.created_at)} · {a.trigger}{a.started_by ? ` · ${a.started_by}` : ""}</span>
              <span className="col-span-1 tabular">{a.lpr_score != null ? `${Math.round(a.lpr_score)}%` : "–"}</span>
              <span className="col-span-3 text-slate-500 truncate text-right">{a.status === "done" ? a.status_label : a.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
