import { Card } from "./ui/card";

export default function ChartSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">{title}</h3>
      {children}
    </Card>
  );
}