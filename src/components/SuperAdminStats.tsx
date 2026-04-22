import type { ModelsReferral } from "@/types/referrals.generated";
import StatCard from "./StatCard";
import ChartSection from "./ChartSection";
import { StatusDonutChart } from "./charts/StatusDonutChart";
import { PriorityBarChart } from "./charts/PriorityBarChart";
import { ServiceTypeBarChart } from "./charts/ServiceTypeBarChart";
import { TrendAreaChart } from "./charts/TrendAreaChart";
import { Link } from "react-router-dom";

export default function SuperAdminStats({ referrals }: { referrals: ModelsReferral[] }) {
  const open = referrals.filter((r) => r.status === "open").length;
  const accepted = referrals.filter((r) => r.status === "accepted").length;
  const closed = referrals.filter((r) => r.status === "closed").length;
  const cancelled = referrals.filter((r) => r.status === "cancelled").length;

  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Referrals" value={referrals.length} sub="in the pool" />
        <StatCard
          label="Open"
          value={open}
          sub="awaiting acceptance"
          accent="var(--chart-2)"
        />
        <StatCard
          label="Accepted"
          value={accepted}
          sub="in progress"
          accent="var(--chart-1)"
        />
        <StatCard
          label="Closed / Cancelled"
          value={closed + cancelled}
          sub="completed or withdrawn"
          accent="var(--chart-5)"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <ChartSection title="Status Distribution">
          <StatusDonutChart referrals={referrals} />
        </ChartSection>
        <ChartSection title="By Priority">
          <PriorityBarChart referrals={referrals} />
        </ChartSection>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <ChartSection title="Top Service Types">
          <ServiceTypeBarChart referrals={referrals} />
        </ChartSection>
        <ChartSection title="Monthly Trend">
          <TrendAreaChart referrals={referrals} />
        </ChartSection>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Link className="btn btn-ghost org-btn" to="/facilities">
          View Facilities →
        </Link>
      </div>
    </div>
  );
}
