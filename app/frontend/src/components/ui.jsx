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
        <circle cx="60" cy="60" r={r} fill="none" stroke="#E2E8F0" strokeWidth="10" />
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
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_STYLE[status] || STATUS_STYLE.needs_human}`}>
      {STATUS_TEXT[status] || status}
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
  if (!label) return null;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${LABEL_STYLE[label] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
      {label}
    </span>
  );
}

export function SourceTag({ source }) {
  const map = { rule: ["Rule", "bg-slate-100 text-slate-600"], ai: ["AI", "bg-sky-50 text-sky-700"], manual: ["Manual", "bg-amber-50 text-amber-700"] };
  const [t, c] = map[source] || [source, "bg-slate-100 text-slate-600"];
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${c}`}>{t}</span>;
}

export function Delta({ value }) {
  if (value == null) return null;
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold border tabular ${up ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
      {up ? "+" : ""}{value} vs last
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
