export default function LoadingSpinner({ label = "Loading…" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-600">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600"
        role="status"
        aria-label={label}
      />
      <p className="text-sm">{label}</p>
    </div>
  );
}
