import { Card } from "./ui/card";

export default function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: string;
}) {
  return (
    <Card className="flex flex-col gap-1 p-5">
      <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </span>
      <span
        className="text-4xl font-extrabold leading-none"
        style={{ color: accent ?? "var(--color-ink)" }}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-slate-400">{sub}</span>}
    </Card>
  );
}


