import { createContext, useCallback, useContext, useState } from "react";
import { useT } from "../prefs.jsx";
// Small shared UI pieces in the style of the team's mockup (navy ink, cyan accent, white cards).

export const BLOCKS = {
  visibility: { label: "Visibility", hint: "weight ×3" },
  services: { label: "Services", hint: "weight ×2" },
  advice: { label: "Advice", hint: "weight ×1" },
  ai_readiness: { label: "AI-readiness", hint: "separate score" },
};

export function scoreColor(score) {
  if (score == null) return "#94A3B8";
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#F59E0B";
  return "#EF4444";
}

export function ScoreRing({ score, size = 112, label = "LPR score" }) {
  const r = 48;
  const c = 2 * Math.PI * r;
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="-rotate-90" style={{ width: size, height: size }}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-slate-200)" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={scoreColor(score)} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} style={{ transition: "stroke-dashoffset .5s" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center tabular">
        <span className="text-2xl font-bold tracking-tight">{score == null ? "–" : `${Math.round(score)}%`}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      </div>
    </div>
  );
}

export function Bar({ value, className = "" }) {
  return (
    <div className={`h-1.5 w-full rounded-full bg-slate-100 overflow-hidden ${className}`}>
      <div className="h-full rounded-full" style={{ width: `${value ?? 0}%`, background: scoreColor(value), transition: "width .5s" }} />
    </div>
  );
}

const STATUS_STYLE = {
  pass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  fail: "bg-red-50 text-red-700 border-red-200",
  needs_human: "bg-slate-100 text-slate-600 border-slate-200",
  error: "bg-orange-50 text-orange-700 border-orange-200",
  not_applicable: "bg-slate-50 text-slate-400 border-slate-200",
};
const STATUS_TEXT = { pass: "Pass", fail: "Fail", needs_human: "Needs human", error: "Error", not_applicable: "n/a" };

export function StatusPill({ status }) {
  const t = useT();
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_STYLE[status] || STATUS_STYLE.needs_human}`}>
      {t(STATUS_TEXT[status] || status)}
    </span>
  );
}

const LABEL_STYLE = {
  "On track": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Gaps to fix": "bg-amber-50 text-amber-800 border-amber-200",
  "Action needed": "bg-red-50 text-red-700 border-red-200",
  "Blocked · manual assessment": "bg-slate-100 text-slate-600 border-slate-300",
  "Audit running": "bg-sky-50 text-sky-700 border-sky-200",
};

export function LabelBadge({ label }) {
  const t = useT();
  if (!label) return null;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${LABEL_STYLE[label] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
      {t(label)}
    </span>
  );
}

export function SourceTag({ source }) {
  const t = useT();
  const map = { rule: ["Rule", "bg-slate-100 text-slate-600"], ai: ["AI", "bg-sky-50 text-sky-700"], manual: ["Manual", "bg-amber-50 text-amber-700"] };
  const [label, c] = map[source] || [source, "bg-slate-100 text-slate-600"];
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${c}`}>{t(label)}</span>;
}

export function Delta({ value }) {
  const t = useT();
  if (value == null) return null;
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold border tabular ${up ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
      {up ? "+" : ""}{value} {t("vs last")}
    </span>
  );
}

export function Button({ children, variant = "primary", className = "", ...props }) {
  const v = {
    primary: "bg-brand text-white hover:bg-sky-700",
    dark: "bg-ink text-white hover:bg-slate-800",
    ghost: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
    subtle: "bg-slate-100 text-slate-700 hover:bg-slate-200",
  }[variant];
  return (
    <button className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${v} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Monogram({ name, className = "" }) {
  const letters = (name || "?").replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase();
  return (
    <div className={`rounded-2xl bg-ink text-white flex items-center justify-center font-bold tracking-tight shrink-0 ${className}`}>
      {letters}
    </div>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="card p-8 text-center">
      <p className="font-semibold text-slate-800">{title}</p>
      <div className="text-sm text-slate-500 mt-1">{children}</div>
    </div>
  );
}

export function fmtDate(iso) {
  if (!iso) return "–";
  const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z");
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/* ---------------------------------------------------------------- help tip, logo, toasts */

export function HelpTip({ text, className = "" }) {
  return (
    <span className={`relative inline-flex group align-middle ${className}`}>
      <span className="w-4 h-4 rounded-full border border-slate-300 text-[10px] font-bold text-slate-400 inline-flex items-center justify-center cursor-help select-none">?</span>
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-6 z-40 w-64 rounded-lg bg-ink text-white text-[11px] font-normal normal-case tracking-normal leading-snug p-2.5 shadow-lg opacity-0 group-hover:opacity-100 transition">
        {text}
      </span>
    </span>
  );
}

export function RetailerLogo({ retailer, className = "w-9 h-9" }) {
  const [failed, setFailed] = useState(false);
  if (!retailer) return null;
  if (failed) return <Monogram name={retailer.name} className={`${className} text-xs rounded-xl`} />;
  return (
    <div className={`${className} rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0`}>
      <img src={`/api/retailers/${retailer.id}/logo`} alt={`${retailer.name} logo`} onError={() => setFailed(true)} className="w-3/4 h-3/4 object-contain" />
    </div>
  );
}

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, kind = "success") => {
    const id = Math.random().toString(36).slice(2);
    setItems((xs) => [...xs, { id, message, kind }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2">
        {items.map((t) => (
          <div key={t.id} className={`px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium text-white ${t.kind === "error" ? "bg-red-600" : "bg-ink"}`}>
            {t.kind === "error" ? "⚠ " : "✓ "}{t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------------------------------------------------------------- form field + switch */
export function Field({ label, required = false, tip, children, className = "" }) {
  const t = useT();
  return (
    <div className={`flex flex-col gap-1 min-w-0 ${className}`}>
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {t(label)}
        {required ? <span className="text-red-500 normal-case" title={t("Required")}>*</span> : <span className="normal-case font-normal tracking-normal text-slate-400">({t("optional")})</span>}
        {tip && <HelpTip text={tip} />}
      </span>
      {children}
    </div>
  );
}

export const inputCls = "w-full text-sm border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-sky-200";

export function Switch({ checked, onChange, label }) {
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="cursor-pointer shrink-0"
        style={{ width: 36, height: 20, borderRadius: 999, position: "relative", padding: 0, border: "none",
          background: checked ? "#0284C7" : "#CBD5E1", transition: "background .15s" }}>
        <span style={{ position: "absolute", top: 2, left: checked ? 18 : 2, width: 16, height: 16, borderRadius: 999,
          background: "#fff", boxShadow: "0 1px 2px rgba(15,23,42,.25)", transition: "left .15s" }} />
      </button>
      {label && <span className="text-sm">{label}</span>}
    </span>
  );
}

/* ---------------------------------------------------------------- loading skeletons */
export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/70 ${className}`} />;
}

export function ListSkeleton({ rows = 6 }) {
  return (
    <div className="card divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3.5 flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <div className="flex-1 space-y-2"><Skeleton className="h-3 w-1/3" /><Skeleton className="h-2.5 w-1/5" /></div>
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-40" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => <div key={i} className="card p-4 space-y-3"><Skeleton className="h-3 w-24" /><Skeleton className="h-7 w-20" /></div>)}
      </div>
      <ListSkeleton rows={5} />
    </div>
  );
}

export function ScorecardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="card p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 items-center">
        <div className="xl:col-span-5 flex gap-4"><Skeleton className="w-14 h-14 rounded-2xl" />
          <div className="flex-1 space-y-2.5"><Skeleton className="h-6 w-40" /><Skeleton className="h-3 w-56" /><Skeleton className="h-5 w-48" /></div></div>
        <div className="xl:col-span-3 flex justify-center"><Skeleton className="w-28 h-28 rounded-full" /></div>
        <div className="xl:col-span-4 grid grid-cols-2 gap-2.5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8"><ListSkeleton rows={6} /></div>
        <div className="lg:col-span-4 space-y-5"><Skeleton className="h-44 rounded-xl" /><Skeleton className="h-44 rounded-xl" /></div>
      </div>
    </div>
  );
}
