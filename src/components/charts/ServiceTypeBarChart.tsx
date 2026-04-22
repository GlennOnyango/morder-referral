import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../ui/chart";
import type { ModelsReferral } from "../../types/referrals.generated";
import { countBy, toChartData } from "./chartHelpers";

const config: ChartConfig = { value: { label: "Referrals", color: "var(--chart-2)" } };

export function ServiceTypeBarChart({ referrals }: { referrals: ModelsReferral[] }) {
  const data = useMemo(
    () => toChartData(countBy(referrals.map((r) => r.serviceType ?? "unknown")), 6),
    [referrals],
  );

  if (!data.length) return <p className="text-sm text-slate-400">No data</p>;

  return (
    <ChartContainer config={config} className="min-h-[180px] w-full">
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
        <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10 }}
          width={90}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" fill="var(--chart-2)" radius={[0, 4, 4, 0]} maxBarSize={24} />
      </BarChart>
    </ChartContainer>
  );
}
