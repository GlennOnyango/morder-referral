function EditTextarea({
  label,
  id,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label
      className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400"
      htmlFor={id}
    >
      {label}
      <textarea
        id={id}
        className="w-full resize-none rounded-xl border border-teal-900/19 bg-white/95 px-3.5 py-2.5 font-[inherit] normal-case text-[0.9rem] tracking-normal text-[#0d2230] placeholder:text-[#506071]/60 focus:border-emerald-700/70 focus:outline-none focus:shadow-[0_0_0_3px_rgba(17,122,101,0.13)]"
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

export default EditTextarea;
