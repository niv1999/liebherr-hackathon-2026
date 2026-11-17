import { useEffect, useState } from "react";
import { api, reviewerName, setReviewerName } from "../api.js";
import { useT } from "../prefs.jsx";
import { Button, Switch, useToast } from "./ui.jsx";

// "Run audit" dialog: choose retailers, optionally the slow listing count, then start.
export default function RunAuditModal({ preselected, onClose, onStarted }) {
  const toast = useToast();
  const t = useT();
  const [retailers, setRetailers] = useState([]);
  const [selected, setSelected] = useState(new Set(preselected || []));
  const [listing, setListing] = useState(false);
  const [name, setName] = useState(reviewerName());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.retailers().then((rs) => {
      setRetailers(rs);
      if (!preselected?.length) setSelected(new Set(rs.filter((r) => !r.access_note).map((r) => r.id)));
    });
  }, []);

  const toggle = (id) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      setReviewerName(name);
      await api.startAudit({ retailer_ids: [...selected], include_listing: listing, started_by: name || null });
      toast(t("Audit started for {n} retailer(s)", { n: selected.size }));
      onStarted();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-bold">{t("Run audit")}</h2>
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t("Retailers")}</p>
          {retailers.map((r) => (
            <label key={r.id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="accent-brand" />
              <span className="text-sm font-medium">{r.name}</span>
              {r.access_note && <span className="ml-auto text-[11px] text-slate-500">{t("blocks bots")}</span>}
            </label>
          ))}
        </div>
        <div className="flex items-start gap-2.5">
          <Switch checked={listing} onChange={setListing} />
          <span className="text-sm">
            {t("Count listed & available models")}
            <span className="block text-xs text-slate-500">{t("Full assortment check · a few extra minutes")}</span>
          </span>
        </div>
        <label className="block text-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t("Your name")} <span className="normal-case font-normal tracking-normal">({t("optional")})</span></span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("e.g. Dominik")}
            className="mt-1 w-full text-sm border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-line" />
        </label>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t("Cancel")}</Button>
          <Button onClick={start} disabled={busy || selected.size === 0}>
            {busy ? t("Starting…") : `${t("Start audit")} (${selected.size})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
