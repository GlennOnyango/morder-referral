import { Input } from "../../../../components/ui/input";

function EditField({
  label,
  id,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label
      className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400"
      htmlFor={id}
    >
      {label}
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="normal-case text-[0.9rem] tracking-normal"
      />
    </label>
  );
}

export default EditField;
