import { useEffect, useState } from "react";
import { api, reviewerName, setReviewerName } from "../api.js";
import { Button, fmtDate } from "../components/ui.jsx";

export default function Settings() {
  const [schedule, setSchedule] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [name, setName] = useState(reviewerName());
  const [audits, setAudits] = useState([]);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    api.schedule().then(setSchedule);
    api.defaults().then(setDefaults);
    api.audits().then(setAudits);
  }, []);

  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(null), 2000); };

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        {msg && <p className="text-xs text-emerald-600 font-semibold mt-1">{msg}</p>}
      </div>

      {schedule && (
        <section className="card p-5 space-y-3">
          <h2 className="text-sm font-bold">Automatic audits</h2>
          <p className="text-xs text-slate-500">Audit all active retailers on a fixed interval. Liebherr: a weekly check is enough.</p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={schedule.enabled} onChange={(e) => setSchedule({ ...schedule, enabled: e.target.checked })} className="accent-sky-600" />
              Enabled
            </label>
            <label className="text-sm">every
              <input type="number" min="1" value={schedule.interval_days} onChange={(e) => setSchedule({ ...schedule, interval_days: Number(e.target.value) })}
                className="mx-2 w-16 border border-slate-300 rounded-md px-2 py-1 text-sm" />days</label>
            <Button onClick={() => api.setSchedule({ enabled: schedule.enabled, interval_days: schedule.interval_days }).then((s) => { setSchedule(s); flash("Schedule saved"); })}>Save</Button>
          </div>
          {schedule.next_run && <p className="text-xs text-slate-500">Next run: {fmtDate(schedule.next_run)}</p>}
        </section>
      )}

      {defaults && (
        <section className="card p-5 space-y-3">
          <h2 className="text-sm font-bold">Audit defaults</h2>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label>Product pages per SK class
              <input type="number" min="1" max="5" value={defaults.samples_per_sk} onChange={(e) => setDefaults({ ...defaults, samples_per_sk: Number(e.target.value) })}
                className="ml-2 w-16 border border-slate-300 rounded-md px-2 py-1" /></label>
            <label>Deadline for fixes (days)
              <input type="number" min="1" value={defaults.due_days} onChange={(e) => setDefaults({ ...defaults, due_days: Number(e.target.value) })}
                className="ml-2 w-16 border border-slate-300 rounded-md px-2 py-1" /></label>
            <Button onClick={() => api.setDefaults(defaults).then(() => flash("Defaults saved"))}>Save</Button>
          </div>
        </section>
      )}

      <section className="card p-5 space-y-3">
        <h2 className="text-sm font-bold">Your name</h2>
        <p className="text-xs text-slate-500">Shown when you correct a verdict or teach the AI (no login in the prototype).</p>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className="border border-slate-300 rounded-md px-2.5 py-1.5 text-sm" placeholder="e.g. Dominik" />
          <Button onClick={() => { setReviewerName(name); flash("Name saved"); }}>Save</Button>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200"><h2 className="text-sm font-bold">Audit history</h2></div>
        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
          {audits.map((a) => (
            <div key={a.id} className="px-5 py-2.5 grid grid-cols-12 gap-2 text-xs items-center">
              <span className="col-span-1 text-slate-400 tabular">#{a.id}</span>
              <span className="col-span-3 font-semibold">{a.retailer}</span>
              <span className="col-span-3 text-slate-500">{fmtDate(a.created_at)} · {a.trigger}{a.started_by ? ` · ${a.started_by}` : ""}</span>
              <span className="col-span-2 tabular">{a.lpr_score != null ? `${Math.round(a.lpr_score)}%` : "–"}</span>
              <span className="col-span-3 text-slate-500 truncate" title={a.progress}>{a.status === "done" ? a.status_label : a.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
