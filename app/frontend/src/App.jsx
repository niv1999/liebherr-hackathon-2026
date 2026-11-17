import { useState } from "react";
import { Link, NavLink, Navigate, Route, Routes } from "react-router-dom";
import Notifications from "./components/Notifications.jsx";
import RunAuditModal from "./components/RunAuditModal.jsx";
import { MoonIcon, SunIcon } from "./components/icons.jsx";
import { Button, ToastProvider } from "./components/ui.jsx";
import Data from "./pages/Data.jsx";
import Overview from "./pages/Overview.jsx";
import Retailer from "./pages/Retailer.jsx";
import Settings from "./pages/Settings.jsx";
import { PrefsProvider, usePrefs } from "./prefs.jsx";

const NAV = [
  { to: "/", label: "Overview", end: true },
  { to: "/retailers", label: "Scorecards" },
  { to: "/data", label: "Data" },
  { to: "/settings", label: "Settings" },
];

export function FridgeMark({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="4" y1="13" x2="20" y2="13" />
      <line x1="8" y1="5.5" x2="8" y2="10" strokeLinecap="round" />
      <line x1="8" y1="16" x2="8" y2="19.5" strokeLinecap="round" />
    </svg>
  );
}

export default function App() {
  return (
    <PrefsProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </PrefsProvider>
  );
}

function Shell() {
  const { t, lang, setLang, theme, setTheme } = usePrefs();
  const [auditOpen, setAuditOpen] = useState(null); // null | {retailerIds?: number[]}
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);
  const runAudit = (ids) => setAuditOpen({ retailerIds: ids });

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-[#0F172A] text-white border-b border-[#1E293B]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <Link to="/" className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-[#0284C7]/20 border border-[#0284C7]/50 flex items-center justify-center text-[#38BDF8]">
                <FridgeMark />
              </div>
              <span className="font-bold tracking-tight text-white">He<span className="text-[#38BDF8]">LPR</span></span>
            </Link>
            <nav className="hidden md:flex items-center gap-1 h-14">
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end}
                  className={({ isActive }) =>
                    `h-full px-3 inline-flex items-center text-xs border-b-2 transition ${isActive ? "border-[#0284C7] text-white font-semibold" : "border-transparent text-[#94A3B8] hover:text-white font-medium"}`}>
                  {t(n.label)}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="hidden sm:flex rounded-md border border-[#334155] overflow-hidden text-[11px] font-semibold">
              {["en", "de"].map((l) => (
                <button key={l} onClick={() => setLang(l)}
                  className={`px-2 py-1 cursor-pointer ${lang === l ? "bg-[#334155] text-white" : "text-[#94A3B8] hover:text-white"}`}>{l.toUpperCase()}</button>
              ))}
            </div>
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title={t(theme === "dark" ? "Light mode" : "Dark mode")}
              className="p-1.5 rounded-lg text-[#CBD5E1] hover:bg-[#1E293B] cursor-pointer">
              {theme === "dark" ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>
            <Notifications refreshKey={refreshKey} />
            <Button onClick={() => setAuditOpen({})}>{t("Run audit")}</Button>
          </div>
        </div>
        <nav className="flex md:hidden gap-1 px-4 pb-2 overflow-x-auto text-xs">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => `px-2.5 py-1 rounded whitespace-nowrap ${isActive ? "bg-[#0284C7] text-white font-semibold" : "text-[#94A3B8]"}`}>
              {t(n.label)}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
          <Route path="/" element={<Overview refreshKey={refreshKey} onRunAudit={runAudit} />} />
          <Route path="/retailers" element={<Retailer refreshKey={refreshKey} onRunAudit={runAudit} />} />
          <Route path="/retailers/:id" element={<Retailer refreshKey={refreshKey} onRunAudit={runAudit} />} />
          <Route path="/data/*" element={<Data />} />
          <Route path="/criteria" element={<Navigate to="/data/criteria" />} />
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
