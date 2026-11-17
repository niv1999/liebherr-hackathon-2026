import { useEffect, useState } from "react";
import { api } from "../../api.js";
import { EditIcon, IconButton } from "../../components/icons.jsx";
import { Button, Field, ListSkeleton, RetailerLogo, bumpLogos, inputCls, useToast } from "../../components/ui.jsx";
import { useT } from "../../prefs.jsx";
import { Toggle } from "./CriteriaData.jsx";

const EMPTY = { name: "", base_url: "https://", brand_page_url: "", search_url: "", product_link_pattern: "", access_note: "" };

export default function RetailersData() {
  const t = useT();
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null); // retailer id | "new"

  const load = () => api.allRetailers().then(setItems);
  useEffect(() => { load(); }, []);

  const toggle = async (r, active) => {
    await api.updateRetailer(r.id, { active });
    toast(t(active ? "{name} activated" : "{name} deactivated", { name: r.name }));
    load();
  };

  if (!items) return <ListSkeleton rows={6} />;
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => setEditing(editing === "new" ? null : "new")}>{editing === "new" ? t("Cancel") : t("+ New retailer")}</Button></div>
      {editing === "new" && <RetailerForm initial={EMPTY} onSaved={() => { setEditing(null); load(); toast(t("Retailer added")); }} />}
      <div className="card divide-y divide-slate-100">
        {items.map((r) => (
          <div key={r.id} className={r.active ? "" : "opacity-60"}>
            <div className="px-4 py-3 flex items-center gap-3">
              <RetailerLogo retailer={r} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{r.name}</p>
                <p className="text-[11px] text-slate-500 truncate" title={r.access_note || ""}>{r.base_url}{r.access_note ? ` · ${r.access_note}` : ""}</p>
              </div>
              <IconButton title={t(editing === r.id ? "Close" : "Edit")} onClick={() => setEditing(editing === r.id ? null : r.id)}><EditIcon /></IconButton>
              <Toggle checked={r.active} onChange={(v) => toggle(r, v)} />
            </div>
            {editing === r.id && (
              <div className="px-4 pb-4">
                <RetailerForm initial={r} onSaved={() => { setEditing(null); load(); toast(t("{name} saved", { name: r.name })); }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Turn "examples" a non-technical user can copy from the browser into what the crawler needs.
export function searchTemplateFrom(example) {
  if (!example) return null;
  const i = example.toLowerCase().indexOf("liebherr");
  return i < 0 ? null : example.slice(0, i) + "{query}" + example.slice(i + "liebherr".length);
}
export function productPatternFrom(example) {
  try {
    const u = new URL(example);
    const parts = u.pathname.split("/").filter(Boolean);
    const keep = parts.length > 1 && /^[a-z]{2}$/.test(parts[0]) ? 2 : 1; // keep language prefix like /de/
    const prefix = parts.slice(0, Math.min(keep, parts.length - 1)).join("/");
    const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return `${esc(u.origin)}/${prefix ? esc(prefix) + "/" : ""}[^?#]+`;
  } catch {
    return null;
  }
}

function RetailerForm({ initial, onSaved }) {
  const t = useT();
  const toast = useToast();
  const v = (k) => initial[k] ?? "";
  const [f, setF] = useState({ name: v("name"), base_url: v("base_url") || "https://", brand_page_url: v("brand_page_url"),
    search_example: "", product_example: "", search_url: v("search_url"), product_link_pattern: v("product_link_pattern"), access_note: v("access_note") });
  const [advanced, setAdvanced] = useState(false);
  const set = (k) => (e) => {
    const next = { ...f, [k]: e.target.value };
    if (k === "search_example") next.search_url = searchTemplateFrom(e.target.value) || f.search_url;
    if (k === "product_example") next.product_link_pattern = productPatternFrom(e.target.value) || f.product_link_pattern;
    setF(next);
  };
  const searchBad = f.search_example && !searchTemplateFrom(f.search_example);
  const save = async () => {
    const body = { name: f.name.trim(), base_url: f.base_url.trim(), brand_page_url: f.brand_page_url || null,
      search_url: f.search_url || null, product_link_pattern: f.product_link_pattern || null, access_note: f.access_note || null };
    try {
      if (initial.id) await api.updateRetailer(initial.id, body);
      else await api.createRetailer(body);
      if (initial.id && body.base_url !== initial.base_url) bumpLogos(); // new address -> icon fetched again
      onSaved();
    } catch (e) {
      toast(e.message, "error");
    }
  };
  return (
    <div className="card p-5 space-y-4 bg-slate-50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Name" required><input value={f.name} onChange={set("name")} placeholder={t("e.g. Elektroplus")} className={inputCls} /></Field>
        <Field label="Shop website" required><input value={f.base_url} onChange={set("base_url")} placeholder="https://www.shop.de" className={inputCls} /></Field>
        <Field label="Search results for “Liebherr”" tip={t("Needed for automatic audits. In the shop, search for Liebherr and paste the address of the results page here; HeLPR uses it to find each model.")}>
          <input value={f.search_example} onChange={set("search_example")} placeholder={f.search_url ? t("✓ set (paste a new one to change)") : "https://www.shop.de/search?q=Liebherr"} className={inputCls} />
          {searchBad && <span className="text-[11px] text-red-600">{t("The address must contain the word “Liebherr”.")}</span>}
        </Field>
        <Field label="Any product page" tip={t("Paste the address of any product page in this shop, so HeLPR recognises product links.")}>
          <input value={f.product_example} onChange={set("product_example")} placeholder={f.product_link_pattern ? t("✓ set (paste a new one to change)") : "https://www.shop.de/p/123/liebherr-cnc-5203"} className={inputCls} />
        </Field>
        <Field label="Liebherr brand page"><input value={f.brand_page_url} onChange={set("brand_page_url")} placeholder="https://www.shop.de/liebherr" className={inputCls} /></Field>
        <Field label="Note"><input value={f.access_note} onChange={set("access_note")} placeholder={t("e.g. blocks automated checks")} className={inputCls} /></Field>
      </div>
      <button onClick={() => setAdvanced(!advanced)} className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer">{advanced ? "▾" : "▸"} {t("Advanced")}</button>
      {advanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Search address template"><input value={f.search_url} onChange={set("search_url")} className={`${inputCls} font-mono text-xs`} /></Field>
          <Field label="Product link pattern"><input value={f.product_link_pattern} onChange={set("product_link_pattern")} className={`${inputCls} font-mono text-xs`} /></Field>
        </div>
      )}
      <div className="flex justify-end"><Button onClick={save} disabled={!f.name.trim() || f.base_url.length < 10 || searchBad}>{t("Save")}</Button></div>
    </div>
  );
}
