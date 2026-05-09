function PriorityBadge({ priority }: { priority?: string }) {
  if (!priority) return null;
  const n = priority.toLowerCase();
  const cls =
    n === "emergency"
      ? "bg-rose-100 text-rose-700 ring-1 ring-rose-200"
      : n === "urgent"
        ? "bg-amber-100 text-amber-700 ring-1 ring-amber-200"
        : "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const n = status.toLowerCase();
  const cls =
    n === "open"
      ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
      : n === "accepted"
        ? "bg-sky-100 text-sky-700 ring-1 ring-sky-200"
        : n === "cancelled"
          ? "bg-rose-100 text-rose-700 ring-1 ring-rose-200"
          : "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {status}
    </span>
  );
}

export { PriorityBadge, StatusBadge };
