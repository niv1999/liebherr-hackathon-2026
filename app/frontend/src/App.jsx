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

export function LogoMark({ className = "w-7 h-7" }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="5" fill="#002F56" />
      <path fill="#FFFFFF" d="M8 7h4.5v7h7V7H24v18h-4.5v-7h-7v7H8z" />
      <rect x="19.5" y="21.5" width="4.5" height="3.5" fill="#80B3DF" />
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
      <header className="sticky top-0 z-30 bg-[#111111] text-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <Link to="/" className="flex items-center gap-2.5 shrink-0">
              <LogoMark />
              <span className="font-head text-xl font-semibold tracking-wide text-white leading-none">HeLPR</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1 h-14">
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end}
                  className={({ isActive }) =>
                    `h-full px-3 inline-flex items-center text-[13px] border-b-2 transition ${isActive ? "border-[#FFFFFF] text-white font-semibold" : "border-transparent text-[#A3A3A3] hover:text-white font-medium"}`}>
                  {t(n.label)}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="hidden sm:flex rounded border border-[#3A3A3A] overflow-hidden text-[11px] font-semibold">
              {["en", "de"].map((l) => (
                <button key={l} onClick={() => setLang(l)}
                  className={`px-2 py-1 cursor-pointer ${lang === l ? "bg-[#3A3A3A] text-white" : "text-[#A3A3A3] hover:text-white"}`}>{l.toUpperCase()}</button>
              ))}
            </div>
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title={t(theme === "dark" ? "Light mode" : "Dark mode")}
              className="p-1.5 rounded text-[#D4D4D4] hover:bg-[#2A2A2A] cursor-pointer">
              {theme === "dark" ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>
            <Notifications refreshKey={refreshKey} />
            <Button variant="light" onClick={() => setAuditOpen({})}>{t("Run audit")}</Button>
          </div>
        </div>
        <nav className="flex md:hidden gap-1 px-4 pb-2 overflow-x-auto text-xs">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => `px-2.5 py-1 rounded whitespace-nowrap ${isActive ? "bg-[#3A3A3A] text-white font-semibold" : "text-[#A3A3A3]"}`}>
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
