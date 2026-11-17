import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { BLOCKS, Button } from "../components/ui.jsx";

const METHOD = {
  rule: ["Rule", "bg-slate-100 text-slate-700", "Checked by code: exact and free"],
  ai: ["AI judge", "bg-sky-50 text-sky-700", "Judged by the AI from text / screenshot"],
  manual: ["Manual", "bg-amber-50 text-amber-800", "Not visible online: always needs a human"],
};
const PAGE = { product: "Product page", brand: "Brand page", shop: "Shop-wide" };

export default function Criteria() {
  const [items, setItems] = useState([]);
  const [block, setBlock] = useState("all");
  const [open, setOpen] = useState(null);
  const [saved, setSaved] = useState(null);

  const load = () => api.criteria().then(setItems);
  useEffect(() => { load(); }, []);

  const save = async (c, patch) => {
    const updated = await api.updateCriterion(c.id, patch);
    setItems((xs) => xs.map((x) => (x.id === c.id ? updated : x)));
    setSaved(c.id);
    setTimeout(() => setSaved(null), 1500);
  };

  const shown = useMemo(() => items.filter((c) => block === "all" || c.block === block), [items, block]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Criteria &amp; weights</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-3xl">
          The LPR Online criteria HeLPR checks. <b>Priority</b> sets the weight (low 1 · medium 2 · high 3), multiplied by the
          block weight (Visibility ×3, Services ×2, Advice ×1; return-risk criteria ×1.5). Changes apply to the next audit.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200 w-fit">
        {[["all", "All"], ...Object.entries(BLOCKS).map(([k, v]) => [k, v.label])].map(([k, label]) => (
          <button key={k} onClick={() => setBlock(k)}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${block === k ? "bg-white shadow-sm" : "text-slate-500"}`}>
            {label} <span className="text-slate-400">{k === "all" ? items.length : items.filter((c) => c.block === k).length}</span>
          </button>
        ))}
      </div>

      <div className="card divide-y divide-slate-100">
        {shown.map((c) => {
          const [mLabel, mCls, mHint] = METHOD[c.method] || METHOD.rule;
          const isOpen = open === c.id;
          return (
            <div key={c.id} className={c.active ? "" : "opacity-50"}>
              <div className="px-4 py-3 grid grid-cols-12 gap-3 items-center">
                <div className="col-span-12 md:col-span-6 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-mono font-semibold text-slate-400">{c.code}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${mCls}`} title={mHint}>{mLabel}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-200">{PAGE[c.page_type]}</span>
                    <span className="text-[10px] text-slate-400">SK {c.sk_levels.replaceAll(",", "/")}</span>
                    {c.return_risk && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-semibold">return risk</span>}
                    {saved === c.id && <span className="text-[10px] text-emerald-600 font-semibold">saved ✓</span>}
                  </div>
                  <p className="text-sm font-semibold mt-0.5">{c.title}</p>
                </div>
                <div className="col-span-5 md:col-span-2 text-xs text-slate-500">{BLOCKS[c.block]?.label}</div>
                <div className="col-span-4 md:col-span-2">
                  <select value={c.priority} onChange={(e) => save(c, { priority: e.target.value })}
                    className="text-xs border border-slate-300 rounded-md px-2 py-1 bg-white cursor-pointer w-full">
                    <option value="low">Low priority</option><option value="medium">Medium priority</option><option value="high">High priority</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-0.5 tabular">weight {c.weight}</p>
                </div>
                <div className="col-span-3 md:col-span-2 flex items-center justify-end gap-2">
                  <label className="inline-flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer" title="Include in audits">
                    <input type="checkbox" checked={c.active} onChange={(e) => save(c, { active: e.target.checked })} className="accent-sky-600" /> on
                  </label>
                  <button onClick={() => setOpen(isOpen ? null : c.id)} className="text-xs text-brand font-semibold cursor-pointer">{isOpen ? "Close" : "Edit"}</button>
                </div>
              </div>
              {isOpen && <EditPanel c={c} onSave={(patch) => save(c, patch)} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EditPanel({ c, onSave }) {
  const [prompt, setPrompt] = useState(c.ai_prompt || "");
  const [fix, setFix] = useState(c.fix_hint || "");
  const [sk, setSk] = useState(c.sk_levels);
  return (
    <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/60">
      {c.description && <p className="md:col-span-2 text-xs text-slate-600">{c.description}</p>}
      {c.method === "ai" && (
        <label className="md:col-span-2 block">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Instruction for the AI judge</span>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={6}
            className="mt-1 w-full text-xs font-mono border border-slate-300 rounded-lg p-2 bg-white" />
        </label>
      )}
      <label className="block">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Suggested fix (shown to retailers)</span>
        <textarea value={fix} onChange={(e) => setFix(e.target.value)} rows={3} className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2 bg-white" />
      </label>
      <div className="space-y-3">
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Applies to SK classes</span>
          <select value={sk} onChange={(e) => setSk(e.target.value)} className="mt-1 block text-xs border border-slate-300 rounded-md px-2 py-1 bg-white">
            {["1,2,3", "2,3", "3"].map((o) => <option key={o} value={o}>SK {o.replaceAll(",", " / ")}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input type="checkbox" defaultChecked={c.return_risk} onChange={(e) => onSave({ return_risk: e.target.checked })} className="accent-sky-600" />
          Return risk (weight ×1.5, listed in the return-risk table)
        </label>
        <Button onClick={() => onSave({ ai_prompt: c.method === "ai" ? prompt : c.ai_prompt, fix_hint: fix, sk_levels: sk })}>Save changes</Button>
      </div>
    </div>
  );
}
