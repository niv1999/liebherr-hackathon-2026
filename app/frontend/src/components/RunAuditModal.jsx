import { useEffect, useState } from "react";
import { api, reviewerName, setReviewerName } from "../api.js";
import { Button } from "./ui.jsx";

// "Run audit" dialog: choose retailers, optionally the slow listing count, then start.
export default function RunAuditModal({ preselected, onClose, onStarted }) {
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
      onStarted();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div>
          <h2 className="text-base font-bold">Run an audit</h2>
          <p className="text-xs text-slate-500 mt-1">
            HeLPR opens each shop like a shopper, checks product pages per SK class and the Liebherr brand page,
            then scores the retailer. About 1–3 minutes per retailer; audits run one after another.
          </p>
        </div>
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Retailers</p>
          {retailers.map((r) => (
            <label key={r.id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="accent-sky-600" />
              <span className="text-sm font-medium">{r.name}</span>
              {r.access_note && <span className="ml-auto text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">blocks bots</span>}
            </label>
          ))}
        </div>
        <label className="flex items-start gap-2.5 text-sm cursor-pointer">
          <input type="checkbox" checked={listing} onChange={(e) => setListing(e.target.checked)} className="mt-1 accent-sky-600" />
          <span>
            Also count listed &amp; available models
            <span className="block text-xs text-slate-500">Searches all 43 reference models; adds ~5 minutes per retailer.</span>
          </span>
        </label>
        <label className="block text-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Your name (shown in history)</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dominik"
            className="mt-1 w-full text-sm border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-200" />
        </label>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={start} disabled={busy || selected.size === 0}>
            {busy ? "Starting…" : `Start audit (${selected.size})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
