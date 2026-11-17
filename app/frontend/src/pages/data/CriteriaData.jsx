import { useEffect, useMemo, useState } from "react";
import { api } from "../../api.js";
import { BLOCKS, Button, Field, HelpTip, ListSkeleton, Switch, inputCls, useToast } from "../../components/ui.jsx";

const METHOD = {
  rule: ["Rule", "bg-slate-100 text-slate-700"],
  ai: ["AI judge", "bg-sky-50 text-sky-700"],
  manual: ["Manual", "bg-amber-50 text-amber-800"],
};
const PAGE = { product: "Product page", brand: "Brand page", shop: "Shop-wide" };
const WEIGHT_TIP = "Priority sets the weight: low 1 · medium 2 · high 3. It is multiplied by the block weight (Visibility ×3, Services ×2, Advice ×1) and by ×1.5 for return-risk criteria. AI-readiness is scored separately.";
const METHOD_TIP = "Rule: checked by code, exact. AI judge: judged by the AI from the page text or screenshot. Manual: not visible online, always needs a human.";

export default function CriteriaData() {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [block, setBlock] = useState("all");
  const [open, setOpen] = useState(null);
  const [adding, setAdding] = useState(false);

  const load = () => api.criteria().then(setItems);
  useEffect(() => { load(); }, []);

  const save = async (c, patch, msg = "Saved") => {
    try {
      const updated = await api.updateCriterion(c.id, patch);
      setItems((xs) => xs.map((x) => (x.id === c.id ? updated : x)));
      toast(msg);
    } catch (e) {
      toast(e.message, "error");
    }
  };
  const remove = async (c) => {
    if (!confirm(`Delete criterion ${c.code} “${c.title}”?`)) return;
    try {
      const r = await api.deleteCriterion(c.id);
      toast(r.deactivated ? `${c.code} switched off (it has audit history)` : `${c.code} deleted`);
      setOpen(null);
      load();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const order = Object.keys(BLOCKS);
  const shown = useMemo(() => (items || []).filter((c) => block === "all" || c.block === block)
    .sort((a, b) => order.indexOf(a.block) - order.indexOf(b.block) || a.code.localeCompare(b.code)), [items, block]);

  if (!items) return <ListSkeleton rows={8} />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200 w-fit">
          {[["all", "All"], ...Object.entries(BLOCKS).map(([k, v]) => [k, v.label])].map(([k, label]) => (
            <button key={k} onClick={() => setBlock(k)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${block === k ? "bg-white shadow-sm" : "text-slate-500"}`}>
              {label} <span className="text-slate-400">{k === "all" ? items.length : items.filter((c) => c.block === k).length}</span>
            </button>
          ))}
        </div>
        <Button onClick={() => setAdding(!adding)}>{adding ? "Cancel" : "+ New criterion"}</Button>
      </div>

      {adding && <NewCriterion existing={items.map((c) => c.code)} onCreated={() => { setAdding(false); load(); toast("Criterion added"); }} />}

      <div className="card">
        <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-200 bg-slate-50/80 rounded-t-xl">
          <span className="col-span-6 flex items-center gap-1.5">Criterion <HelpTip text={METHOD_TIP} /></span>
          <span className="col-span-2">Block</span>
          <span className="col-span-2 flex items-center gap-1.5">Priority <HelpTip text={WEIGHT_TIP} /></span>
          <span className="col-span-2 text-right">On</span>
        </div>
        <div className="divide-y divide-slate-100">
          {shown.map((c) => {
            const [mLabel, mCls] = METHOD[c.method] || METHOD.rule;
            const isOpen = open === c.id;
            return (
              <div key={c.id} className={c.active ? "" : "opacity-50"}>
                <div className="px-4 py-3 grid grid-cols-12 gap-3 items-center">
                  <button onClick={() => setOpen(isOpen ? null : c.id)} className="col-span-12 md:col-span-6 min-w-0 text-left cursor-pointer">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-mono font-semibold text-slate-400">{c.code}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${mCls}`}>{mLabel}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-200">{PAGE[c.page_type]}</span>
                      <span className="text-[10px] text-slate-400">SK {c.sk_levels.replaceAll(",", "/")}</span>
                      {c.return_risk && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-semibold">return risk</span>}
                    </div>
                    <p className="text-sm font-semibold mt-0.5">{c.title}</p>
                  </button>
                  <div className="col-span-4 md:col-span-2 text-xs text-slate-500">{BLOCKS[c.block]?.label}</div>
                  <div className="col-span-5 md:col-span-2 flex items-center gap-2">
                    <select value={c.priority} onChange={(e) => save(c, { priority: e.target.value }, `${c.code}: ${e.target.value} priority`)}
                      className="text-xs border border-slate-300 rounded-md px-2 py-1 bg-white cursor-pointer">
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                    </select>
                    <span className="text-[10px] text-slate-400 tabular">×{c.weight}</span>
                  </div>
                  <div className="col-span-3 md:col-span-2 flex justify-end items-center gap-3">
                    <button onClick={() => setOpen(isOpen ? null : c.id)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-md border cursor-pointer ${isOpen ? "bg-ink text-white border-ink" : "text-brand border-sky-200 bg-sky-50 hover:bg-sky-100"}`}>
                      {isOpen ? "Close" : "Edit"}
                    </button>
                    <Toggle checked={c.active} onChange={(v) => save(c, { active: v }, `${c.code} ${v ? "on" : "off"}`)} />
                  </div>
                </div>
                {isOpen && <EditPanel c={c} onSave={(patch) => save(c, patch)} onDelete={() => remove(c)} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const Toggle = Switch;

const FIX_TIP = "Shown to the retailer in its to-do list and PDF report when this criterion fails.";
const PROMPT_TIP = "Tell the AI judge when the page passes and when it fails. It sees a screenshot of the page and the page text.";
const sel = `${inputCls} cursor-pointer`;

function EditPanel({ c, onSave, onDelete }) {
  const [prompt, setPrompt] = useState(c.ai_prompt || "");
  const [fix, setFix] = useState(c.fix_hint || "");
  const [sk, setSk] = useState(c.sk_levels);
  const [risk, setRisk] = useState(c.return_risk);
  return (
    <div className="px-4 pb-4 pt-1 space-y-4 bg-slate-50/60">
      {c.description && <p className="text-xs text-slate-600">{c.description}</p>}
      {c.method === "ai" && (
        <Field label="AI instruction" required tip={PROMPT_TIP}>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={8} className={`${inputCls} font-mono text-xs`} />
        </Field>
      )}
      <Field label="Fix advice for the retailer" tip={FIX_TIP}>
        <textarea value={fix} onChange={(e) => setFix(e.target.value)} rows={2} className={inputCls} />
      </Field>
      <div className="flex flex-wrap items-end gap-6">
        <Field label="SK classes" required>
          <select value={sk} onChange={(e) => setSk(e.target.value)} className={sel}>
            {["1,2,3", "2,3", "3"].map((o) => <option key={o} value={o}>SK {o.replaceAll(",", " / ")}</option>)}
          </select>
        </Field>
        <Switch checked={risk} onChange={setRisk} label="Return risk" />
        <div className="flex gap-2 ml-auto">
          <Button variant="ghost" onClick={onDelete}>Delete</Button>
          <Button onClick={() => onSave({ ai_prompt: c.method === "ai" ? prompt : c.ai_prompt, fix_hint: fix, sk_levels: sk, return_risk: risk })}>Save</Button>
        </div>
      </div>
    </div>
  );
}

function NewCriterion({ onCreated, existing }) {
  const toast = useToast();
  const [f, setF] = useState({ title: "", block: "visibility", page_type: "product", sk_levels: "1,2,3", priority: "medium", ai_prompt: "", fix_hint: "", code: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const nextCode = () => {
    let n = 1;
    while (existing.includes(`CUS-${String(n).padStart(2, "0")}`)) n++;
    return `CUS-${String(n).padStart(2, "0")}`;
  };
  const create = async () => {
    try {
      await api.createCriterion({ ...f, code: f.code || nextCode(), section: "Custom", method: "ai" });
      onCreated();
    } catch (e) {
      toast(e.message, "error");
    }
  };
  return (
    <div className="card p-5 space-y-4">
      <h3 className="text-sm font-bold">New criterion <span className="text-xs font-normal text-slate-500">· judged by the AI</span></h3>
      <Field label="Title" required>
        <input value={f.title} onChange={set("title")} placeholder="e.g. Energy label shown next to the price" className={inputCls} />
      </Field>
      <Field label="AI instruction" required tip={PROMPT_TIP}>
        <textarea value={f.ai_prompt} onChange={set("ai_prompt")} rows={6} className={`${inputCls} font-mono text-xs`}
          placeholder={"PASS if …\nFAIL if …"} />
      </Field>
      <Field label="Fix advice for the retailer" tip={FIX_TIP}>
        <input value={f.fix_hint} onChange={set("fix_hint")} placeholder="e.g. Show the energy label next to the price" className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Field label="Block"><select value={f.block} onChange={set("block")} className={sel}>{Object.entries(BLOCKS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
        <Field label="Page"><select value={f.page_type} onChange={set("page_type")} className={sel}>{Object.entries(PAGE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="SK classes"><select value={f.sk_levels} onChange={set("sk_levels")} className={sel}>{["1,2,3", "2,3", "3"].map((o) => <option key={o} value={o}>SK {o.replaceAll(",", " / ")}</option>)}</select></Field>
        <Field label="Priority"><select value={f.priority} onChange={set("priority")} className={sel}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field>
        <Field label="Code"><input value={f.code} onChange={set("code")} placeholder={nextCode()} className={inputCls} /></Field>
      </div>
      <div className="flex justify-end"><Button onClick={create} disabled={!f.title || !f.ai_prompt}>Add criterion</Button></div>
    </div>
  );
}
