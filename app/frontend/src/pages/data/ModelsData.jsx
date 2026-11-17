import { useEffect, useMemo, useState } from "react";
import { api } from "../../api.js";
import { IconButton, TrashIcon } from "../../components/icons.jsx";
import { Button, Field, HelpTip, ListSkeleton, inputCls, useToast } from "../../components/ui.jsx";
import { useT } from "../../prefs.jsx";
import { Toggle } from "./CriteriaData.jsx";

const FIELDS = [
  ["model", "Model", "w-36"],
  ["sk", "SK", "w-14"],
  ["ean", "EAN", "w-32"],
  ["series", "Series", "w-20"],
  ["height_mm", "H mm", "w-16"],
  ["width_mm", "W mm", "w-16"],
  ["depth_mm", "D mm", "w-16"],
  ["energy_class", "Energy", "w-14"],
  ["door_hinge", "Hinge", "w-20"],
  ["handle", "Handle", "w-40"],
];
const NUM = new Set(["height_mm", "width_mm", "depth_mm"]);
const TIP = "Liebherr's reference data (2026 assortment). HeLPR compares retailer pages against these values: model name, EAN, dimensions, door hinge and handle. Inactive models are not audited.";

export default function ModelsData() {
  const t = useT();
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [q, setQ] = useState("");
  const [sk, setSk] = useState("all");
  const [adding, setAdding] = useState(false);

  const load = () => api.products().then(setItems);
  useEffect(() => { load(); }, []);

  const shown = useMemo(() => (items || []).filter((p) => (sk === "all" || p.sk === sk) && (!q || p.model.toLowerCase().includes(q.toLowerCase()))), [items, q, sk]);

  const save = async (p, field, raw) => {
    const value = NUM.has(field) ? (raw === "" ? null : Number(raw)) : raw || null;
    const current = NUM.has(field) && p[field] != null ? Math.round(p[field]) : p[field] ?? null;
    if (current === value) return;
    try {
      await api.updateProduct(p.id, { [field]: value });
      setItems((xs) => xs.map((x) => (x.id === p.id ? { ...x, [field]: value } : x)));
      toast(t("{model} updated", { model: p.model }));
    } catch (e) {
      toast(e.message, "error");
    }
  };
  const toggle = async (p, active) => {
    await api.updateProduct(p.id, { active });
    setItems((xs) => xs.map((x) => (x.id === p.id ? { ...x, active } : x)));
    toast(t(active ? "{model} included in audits" : "{model} excluded from audits", { model: p.model }));
  };
  const remove = async (p) => {
    if (!confirm(t("Remove {model}?", { model: p.model }))) return;
    const r = await api.deleteProduct(p.id);
    toast(t(r.deactivated ? "{model} excluded (it has audit history)" : "{model} removed", { model: p.model }));
    load();
  };

  if (!items) return <ListSkeleton rows={10} />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search model")} className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 w-48" />
          <div className="flex gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200">
            {["all", "1", "2", "3", "frei"].map((k) => (
              <button key={k} onClick={() => setSk(k)} className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${sk === k ? "bg-white shadow-sm" : "text-slate-500"}`}>
                {k === "all" ? t("All") : k === "frei" ? t("No SK") : `SK${k}`}
              </button>
            ))}
          </div>
          <HelpTip text={t(TIP)} />
        </div>
        <Button onClick={() => setAdding(!adding)}>{adding ? t("Cancel") : t("+ New model")}</Button>
      </div>

      {adding && <NewModel onCreated={() => { setAdding(false); load(); toast(t("Model added")); }} />}

      <div className="card overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200 bg-slate-50/80">
              {FIELDS.map(([k, l]) => <th key={k} className="px-2 py-2 font-semibold">{t(l)}</th>)}
              <th className="px-2 py-2 font-semibold">{t("Audited")}</th><th />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.map((p) => (
              <tr key={p.id} className={p.active ? "" : "opacity-50"}>
                {FIELDS.map(([k, , w]) => (
                  <td key={k} className="px-1 py-1">
                    <input defaultValue={NUM.has(k) && p[k] != null ? Math.round(p[k]) : p[k] ?? ""} onBlur={(e) => save(p, k, e.target.value)}
                      className={`${w} px-1.5 py-1 rounded border border-transparent hover:border-slate-200 focus:border-sky-300 focus:outline-none bg-transparent ${k === "model" ? "font-semibold" : ""}`} />
                  </td>
                ))}
                <td className="px-2"><Toggle checked={p.active} onChange={(v) => toggle(p, v)} /></td>
                <td className="px-2 text-right"><IconButton title={t("Remove")} danger onClick={() => remove(p)}><TrashIcon /></IconButton></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-slate-400">{t("{n} models", { n: shown.length })}</p>
    </div>
  );
}

function NewModel({ onCreated }) {
  const t = useT();
  const toast = useToast();
  const [f, setF] = useState({ model: "", sk: "1", ean: "", series: "", height_mm: "", width_mm: "", depth_mm: "", energy_class: "", door_hinge: "", handle: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const create = async () => {
    const body = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, NUM.has(k) ? (v === "" ? null : Number(v)) : v.trim() || null]));
    try {
      await api.createProduct(body);
      onCreated();
    } catch (e) {
      toast(e.message, "error");
    }
  };
  return (
    <div className="card p-5 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Field label="Model" required className="col-span-2"><input value={f.model} onChange={set("model")} placeholder="e.g. CNc 5203-22" className={inputCls} /></Field>
        <Field label="SK class" required>
          <select value={f.sk} onChange={set("sk")} className={inputCls}><option value="1">SK1</option><option value="2">SK2</option><option value="3">SK3</option><option value="frei">{t("No SK")}</option></select>
        </Field>
        <Field label="EAN" className="col-span-2"><input value={f.ean} onChange={set("ean")} className={inputCls} /></Field>
        <Field label="Height mm"><input value={f.height_mm} onChange={set("height_mm")} inputMode="numeric" className={inputCls} /></Field>
        <Field label="Width mm"><input value={f.width_mm} onChange={set("width_mm")} inputMode="numeric" className={inputCls} /></Field>
        <Field label="Depth mm"><input value={f.depth_mm} onChange={set("depth_mm")} inputMode="numeric" className={inputCls} /></Field>
        <Field label="Energy class"><input value={f.energy_class} onChange={set("energy_class")} placeholder="A–G" className={inputCls} /></Field>
        <Field label="Series"><input value={f.series} onChange={set("series")} placeholder="Pure / Plus / Prime / Peak" className={inputCls} /></Field>
        <Field label="Door hinge"><input value={f.door_hinge} onChange={set("door_hinge")} placeholder="rechts" className={inputCls} /></Field>
        <Field label="Handle" className="col-span-2 md:col-span-4"><input value={f.handle} onChange={set("handle")} placeholder="e.g. Griffmulde" className={inputCls} /></Field>
      </div>
      <div className="flex justify-end"><Button onClick={create} disabled={!f.model.trim()}>{t("Add model")}</Button></div>
    </div>
  );
}
