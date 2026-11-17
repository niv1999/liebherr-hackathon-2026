import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useT } from "../prefs.jsx";
import { fmtDate } from "./ui.jsx";

// Bell with unread count; polls every 15 s. Clicking a notification opens that audit and marks it read.
export default function Notifications({ refreshKey }) {
  const t = useT();
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const load = () => api.notifications().then(setItems).catch(() => {});
  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [refreshKey]);

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const openItem = async (n) => {
    if (!n.read) await api.markRead(n.id).catch(() => {});
    setOpen(false);
    load();
    if (n.retailer_id) nav(`/retailers/${n.retailer_id}${n.run_id ? `?run=${n.run_id}` : ""}`);
  };

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="relative p-1.5 rounded-lg hover:bg-[#1E293B] cursor-pointer" title={t("Notifications")}>
        <svg className="w-5 h-5 text-[#CBD5E1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-[#0284C7] text-white text-[10px] font-bold flex items-center justify-center">{unread}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-96 card text-slate-900 shadow-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
            <span className="text-sm font-semibold">{t("Notifications")}</span>
            {unread > 0 && (
              <button className="text-[11px] text-brand font-semibold cursor-pointer" onClick={() => api.readAll().then(load)}>{t("Mark all read")}</button>
            )}
          </div>
          <div className="max-h-[28rem] overflow-y-auto divide-y divide-slate-100">
            {items.length === 0 && <p className="p-4 text-xs text-slate-500">{t("No notifications yet.")}</p>}
            {items.map((n) => (
              <button key={n.id} onClick={() => openItem(n)}
                className={`w-full text-left px-4 py-3 flex gap-3 cursor-pointer transition ${n.read ? "opacity-60 hover:opacity-100 hover:bg-slate-50" : "bg-sky-50 hover:bg-sky-100 border-l-4 border-brand"}`}>
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.read ? "bg-transparent" : "bg-brand"}`} />
                <span className="min-w-0">
                  <span className={`block text-xs ${n.read ? "font-medium" : "font-bold"}`}>{n.title}</span>
                  <span className="block text-[11px] text-slate-600 mt-0.5">{n.body}</span>
                  <span className="block text-[10px] text-slate-400 mt-1">{fmtDate(n.created_at)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
