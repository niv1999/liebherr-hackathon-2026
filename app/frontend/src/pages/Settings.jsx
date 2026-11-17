import { useEffect, useState } from "react";
import { api, reviewerName, setReviewerName } from "../api.js";
import { Button, Field, HelpTip, Skeleton, Switch, fmtDate, inputCls as fieldCls, useToast } from "../components/ui.jsx";

const MODELS = {
  gemini: [["gemini-2.5-flash", "Gemini 2.5 Flash (free tier)"], ["gemini-2.5-pro", "Gemini 2.5 Pro"]],
  claude: [["claude-opus-5-5", "Claude Opus 5.5"], ["claude-sonnet-5-5", "Claude Sonnet 5.5"], ["claude-haiku-5-5", "Claude Haiku 5.5"]],
};
const AI_TIP = "The AI judge decides the criteria that need judgement: feature texts, premium look and the AI shopper test.";

const card = "card p-5 space-y-3";
const h2 = "text-sm font-bold flex items-center gap-1.5";
const inputCls = "border border-slate-300 rounded-md px-2.5 py-1.5 text-sm";

export default function Settings() {
  const toast = useToast();
  const [schedule, setSchedule] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [conns, setConns] = useState(null);
  const [name, setName] = useState(reviewerName());
  const [audits, setAudits] = useState([]);

  useEffect(() => {
    api.schedule().then(setSchedule);
    api.defaults().then(setDefaults);
    api.audits().then(setAudits);
    api.aiConnections().then(setConns);
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

  return (
    <div className="space-y-5 max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      {!conns && [0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      {conns && <AiConnections conns={conns} setConns={setConns} />}

      {schedule && (
        <section className={card}>
          <div className="flex items-center justify-between">
            <h2 className={h2}>Automatic audits</h2>
            <Switch checked={schedule.enabled} onChange={async (v) => {
              const s = await run(() => api.setSchedule({ enabled: v, interval_days: schedule.interval_days }), v ? "Automatic audits on" : "Automatic audits off");
              if (s) setSchedule(s);
            }} />
          </div>
          {schedule.enabled && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm">Audit all retailers every</span>
                <input type="number" min="1" value={schedule.interval_days} onChange={(e) => setSchedule({ ...schedule, interval_days: Number(e.target.value) })} className={`w-16 ${inputCls}`} />
                <span className="text-sm">days</span>
                <Button onClick={async () => { const s = await run(() => api.setSchedule({ enabled: true, interval_days: schedule.interval_days }), "Schedule saved"); if (s) setSchedule(s); }}>Save</Button>
              </div>
              {schedule.next_run && <p className="text-xs text-slate-500">Next run {fmtDate(schedule.next_run)}</p>}
            </>
          )}
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

function AiConnections({ conns, setConns }) {
  const toast = useToast();
  const [adding, setAdding] = useState(conns.length === 0);
  const [f, setF] = useState({ provider: "gemini", model: MODELS.gemini[0][0], api_key: "", name: "" });
  const reload = () => api.aiConnections().then(setConns);

  const add = async () => {
    try {
      const c = await api.addAiConnection({ ...f, name: f.name || null });
      toast(`Connected: ${c.name}`);
      setF({ ...f, api_key: "", name: "" });
      setAdding(false);
      reload();
    } catch (e) {
      toast(e.message, "error");
    }
  };
  const use = async (c) => {
    try { await api.activateAiConnection(c.id); toast(`Now using ${c.name}`); reload(); } catch (e) { toast(e.message, "error"); }
  };
  const remove = async (c) => {
    if (!confirm(`Remove the connection “${c.name}”?`)) return;
    try { await api.deleteAiConnection(c.id); toast("Connection removed"); reload(); } catch (e) { toast(e.message, "error"); }
  };

  return (
    <section className={card}>
      <div className="flex items-center justify-between">
        <h2 className={h2}>AI judge <HelpTip text={AI_TIP} /></h2>
        {!adding && <Button variant="ghost" onClick={() => setAdding(true)}>+ Add connection</Button>}
      </div>

      {conns.length > 0 && (
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
          {conns.map((c) => (
            <label key={c.id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer ${c.active ? "bg-sky-50/60" : "hover:bg-slate-50"}`}>
              <input type="radio" name="ai-conn" checked={c.active} onChange={() => use(c)} className="accent-sky-600" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{c.name}</p>
                <p className="text-[11px] text-slate-500">{c.provider === "claude" ? "Anthropic Claude" : "Google Gemini"} · {c.model} · key {c.key_hint}</p>
              </div>
              {c.active && <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">In use</span>}
              <button onClick={(e) => { e.preventDefault(); remove(c); }} className="text-xs text-slate-400 hover:text-red-600 cursor-pointer px-1">Remove</button>
            </label>
          ))}
        </div>
      )}

      {adding && (
        <div className="rounded-lg border border-slate-200 p-4 space-y-3 bg-slate-50/60">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Provider" required>
              <select value={f.provider} onChange={(e) => setF({ ...f, provider: e.target.value, model: MODELS[e.target.value][0][0] })} className={fieldCls}>
                <option value="gemini">Google Gemini</option><option value="claude">Anthropic Claude</option>
              </select>
            </Field>
            <Field label="Model" required>
              <select value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} className={fieldCls}>
                {MODELS[f.provider].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="API key" required>
              <input type="password" value={f.api_key} onChange={(e) => setF({ ...f, api_key: e.target.value })} placeholder="Paste key" className={fieldCls} />
            </Field>
            <Field label="Name">
              <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Generated automatically" className={fieldCls} />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            {conns.length > 0 && <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>}
            <Button onClick={add} disabled={!f.api_key.trim()}>Connect</Button>
          </div>
        </div>
      )}
    </section>
  );
}
