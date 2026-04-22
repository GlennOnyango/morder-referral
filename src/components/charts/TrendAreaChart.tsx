import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../ui/chart";
import type { ModelsReferral } from "../../types/referrals.generated";
import { buildMonthlyTrend } from "./chartHelpers";

const trendChartConfig: ChartConfig = {
  count: { label: "Referrals", color: "var(--chart-1)" },
};

export function TrendAreaChart({ referrals }: { referrals: ModelsReferral[] }) {
  const data = useMemo(() => buildMonthlyTrend(referrals), [referrals]);

  if (!data.length) return <p className="text-sm text-slate-400">No data</p>;

  return (
    <ChartContainer config={trendChartConfig} className="min-h-[160px] w-full">
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={28} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey="count"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#trendGrad)"
          dot={{ fill: "var(--chart-1)", r: 3 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}
