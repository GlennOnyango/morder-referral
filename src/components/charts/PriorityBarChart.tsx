import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../ui/chart";
import type { ModelsReferral } from "../../types/referrals.generated";
import { PRIORITY_COLORS } from "./chartColors";
import { countBy, toChartData } from "./chartHelpers";

export function PriorityBarChart({ referrals }: { referrals: ModelsReferral[] }) {
  const data = useMemo(
    () => toChartData(countBy(referrals.map((r) => r.priority ?? "unknown"))),
    [referrals],
  );

  const config = useMemo(
    () =>
      Object.fromEntries(
        data.map(({ name }) => [name, { label: name, color: PRIORITY_COLORS[name] ?? "var(--chart-2)" }]),
      ) as ChartConfig,
    [data],
  );

  if (!data.length) return <p className="text-sm text-slate-400">No data</p>;

  return (
    <ChartContainer config={config} className="min-h-[180px] w-full">
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={28} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map((entry) => (
            <Cell
              key={entry.name}
              fill={PRIORITY_COLORS[entry.name] ?? "var(--chart-2)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
