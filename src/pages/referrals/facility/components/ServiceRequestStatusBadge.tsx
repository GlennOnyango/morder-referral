function ServiceRequestStatusBadge({ status }: { status: string | undefined }) {
  const s = status ?? "pending";
  const cls =
    s === "accepted"
      ? "bg-emerald-100 text-emerald-800"
      : s === "rejected"
        ? "bg-rose-100 text-rose-800"
        : s === "completed"
          ? "bg-blue-100 text-blue-800"
          : "bg-slate-100 text-slate-600";
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cls}`}
    >
      {s}
    </span>
  );
}

export default ServiceRequestStatusBadge;
