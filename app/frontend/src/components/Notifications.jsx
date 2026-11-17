import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { fmtDate } from "./ui.jsx";

// Bell with unread count; polls every 15 s so finished audits show up without reloading.
export default function Notifications({ refreshKey }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const load = () => api.notifications().then(setItems).catch(() => {});
  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [refreshKey]);

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="relative p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer" title="Notifications">
        <svg className="w-5 h-5 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-brand text-[10px] font-bold flex items-center justify-center">{unread}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 card text-slate-900 shadow-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold">Notifications</span>
            {unread > 0 && (
              <button className="text-[11px] text-brand font-semibold cursor-pointer" onClick={() => api.readAll().then(load)}>Mark all read</button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {items.length === 0 && <p className="p-4 text-xs text-slate-500">No notifications yet. Run an audit.</p>}
            {items.map((n) => (
              <div key={n.id} className={`px-3 py-2.5 ${n.read ? "" : "bg-sky-50/60"}`}>
                <p className="text-xs font-semibold">{n.title}</p>
                <p className="text-[11px] text-slate-600 mt-0.5">{n.body}</p>
                <p className="text-[10px] text-slate-400 mt-1">{fmtDate(n.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
