function InfoFieldLong({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap wrap-break-word">{value || "—"}</dd>
    </div>
  );
}

export default InfoFieldLong;
