export default function StatCard({ title, value, hint, accent = "sky" }) {
  const ring =
    accent === "amber"
      ? "ring-amber-200/80 bg-amber-50/90"
      : accent === "emerald"
        ? "ring-emerald-200/80 bg-emerald-50/90"
        : "ring-sky-200/80 bg-sky-50/90";
  return (
    <div className={`rounded-2xl border border-slate-200/80 p-5 shadow-sm ring-1 ${ring}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-600">{hint}</p> : null}
    </div>
  );
}
