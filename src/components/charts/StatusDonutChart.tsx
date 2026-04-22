import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../ui/chart";
import type { ModelsReferral } from "../../types/referrals.generated";
import { STATUS_COLORS } from "./chartColors";
import { countBy } from "./chartHelpers";

const statusChartConfig: ChartConfig = {
  open: { label: "Open", color: STATUS_COLORS.open },
  accepted: { label: "Accepted", color: STATUS_COLORS.accepted },
  cancelled: { label: "Cancelled", color: STATUS_COLORS.cancelled },
  closed: { label: "Closed", color: STATUS_COLORS.closed },
};

export function StatusDonutChart({ referrals }: { referrals: ModelsReferral[] }) {
  const data = useMemo(() => {
    const counts = countBy(referrals.map((r) => r.status ?? "unknown"));
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [referrals]);

  if (!data.length) return <p className="text-sm text-slate-400">No data</p>;

  return (
    <ChartContainer config={statusChartConfig} className="mx-auto aspect-square max-h-[220px]">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
          nameKey="name"
        >
          {data.map((entry) => (
            <Cell
              key={entry.name}
              fill={STATUS_COLORS[entry.name] ?? "var(--chart-5)"}
            />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="name" />} />
      </PieChart>
    </ChartContainer>
  );
}
