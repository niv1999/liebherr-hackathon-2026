import { useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { api } from "./api.js";
import Notifications from "./components/Notifications.jsx";
import RunAuditModal from "./components/RunAuditModal.jsx";
import { Button } from "./components/ui.jsx";
import Criteria from "./pages/Criteria.jsx";
import Overview from "./pages/Overview.jsx";
import Retailer from "./pages/Retailer.jsx";
import Settings from "./pages/Settings.jsx";

const NAV = [
  { to: "/", label: "Overview", end: true },
  { to: "/retailers", label: "Retailer scorecards" },
  { to: "/criteria", label: "Criteria & weights" },
  { to: "/settings", label: "Settings" },
];

export default function App() {
  const [auditOpen, setAuditOpen] = useState(null); // null | {retailerIds?: number[]}
  const [refreshKey, setRefreshKey] = useState(0);
  const [ai, setAi] = useState(null);

  useEffect(() => {
    api.aiStatus().then(setAi).catch(() => setAi(null));
  }, []);

  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-ink text-white border-b border-slate-800">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-brand/20 border border-brand/50 flex items-center justify-center">
                <svg className="w-4 h-4 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect x="4" y="2" width="16" height="20" rx="2" />
                  <line x1="4" y1="13" x2="20" y2="13" />
                  <line x1="8" y1="5.5" x2="8" y2="10" strokeLinecap="round" />
                  <line x1="8" y1="16" x2="8" y2="19.5" strokeLinecap="round" />
                </svg>
              </div>
              <span className="font-bold tracking-tight">
                He<span className="text-sky-400">LPR</span>
              </span>
              <span className="hidden lg:inline text-[11px] text-slate-400">Liebherr Performance Rebate · webshop audits</span>
            </div>
            <nav className="hidden md:flex items-center gap-1 h-14">
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end}
                  className={({ isActive }) =>
                    `h-full px-3 inline-flex items-center text-xs border-b-2 transition ${isActive ? "border-brand text-white font-semibold" : "border-transparent text-slate-400 hover:text-white font-medium"}`}>
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2.5">
            {ai && (
              <span title={ai.available ? `AI judge: ${ai.provider} ${ai.model || ""}` : "No AI key yet: AI criteria are marked 'needs human'"}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-[11px] text-slate-300">
                <span className={`w-1.5 h-1.5 rounded-full ${ai.available ? "bg-emerald-400" : "bg-amber-400"}`} />
                {ai.available ? "AI judge on" : "AI judge off"}
              </span>
            )}
            <Notifications refreshKey={refreshKey} />
            <Button onClick={() => setAuditOpen({})}>Run audit</Button>
          </div>
        </div>
        <nav className="flex md:hidden gap-1 px-4 pb-2 overflow-x-auto text-xs">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => `px-2.5 py-1 rounded whitespace-nowrap ${isActive ? "bg-brand text-white font-semibold" : "text-slate-400"}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
          <Route path="/" element={<Overview refreshKey={refreshKey} onRunAudit={(ids) => setAuditOpen({ retailerIds: ids })} />} />
          <Route path="/retailers" element={<Retailer refreshKey={refreshKey} onRunAudit={(ids) => setAuditOpen({ retailerIds: ids })} />} />
          <Route path="/retailers/:id" element={<Retailer refreshKey={refreshKey} onRunAudit={(ids) => setAuditOpen({ retailerIds: ids })} />} />
          <Route path="/criteria" element={<Criteria />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      {auditOpen && (
        <RunAuditModal preselected={auditOpen.retailerIds} onClose={() => setAuditOpen(null)}
          onStarted={() => { setAuditOpen(null); refresh(); }} />
      )}
    </div>
  );
}
