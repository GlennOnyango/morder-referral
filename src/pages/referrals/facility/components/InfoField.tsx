function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="text-sm font-medium text-slate-800 wrap-break-word">{value || "—"}</dd>
    </div>
  );
}

export default InfoField;
