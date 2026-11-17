import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useT } from "../prefs.jsx";
import CriteriaData from "./data/CriteriaData.jsx";
import ModelsData from "./data/ModelsData.jsx";
import RetailersData from "./data/RetailersData.jsx";

const TABS = [
  ["criteria", "Criteria"],
  ["models", "Models"],
  ["retailers", "Retailers"],
];

export default function Data() {
  const t = useT();
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("Data")}</h1>
        <div className="inline-flex p-1 rounded-md bg-slate-100 border border-slate-200 gap-1">
          {TABS.map(([k, label]) => (
            <NavLink key={k} to={`/data/${k}`}
              className={({ isActive }) => `px-3 py-1.5 rounded-md text-xs font-semibold ${isActive ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-800"}`}>
              {t(label)}
            </NavLink>
          ))}
        </div>
      </div>
      <Routes>
        <Route path="criteria" element={<CriteriaData />} />
        <Route path="models" element={<ModelsData />} />
        <Route path="retailers" element={<RetailersData />} />
        <Route path="*" element={<Navigate to="/data/criteria" replace />} />
      </Routes>
    </div>
  );
}
