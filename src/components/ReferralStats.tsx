import StatCard from "@/components/StatCard";
import type { ModelsReferral } from "@/types/referrals.generated";
import { useMemo } from "react";
import ChartSection from "./ChartSection";
import { StatusDonutChart } from "./charts/StatusDonutChart";
import { PriorityBarChart } from "./charts/PriorityBarChart";
import { ServiceTypeBarChart } from "./charts/ServiceTypeBarChart";
import { TrendAreaChart } from "./charts/TrendAreaChart";
import { Link } from "react-router-dom";

export default function ReferralStats({
  originReferrals,
  acceptedReferrals,
  facilityId,
}: {
  originReferrals: ModelsReferral[];
  acceptedReferrals: ModelsReferral[];
  facilityId?: string;
}) {
  const allReferrals = useMemo(
    () => [...originReferrals, ...acceptedReferrals],
    [originReferrals, acceptedReferrals],
  );

  const created = originReferrals.length;
  const accepted = acceptedReferrals.length;
  const openCount = originReferrals.filter((r) => r.status === "open").length;
  const directCount = originReferrals.filter((r) => Boolean(r.acceptedByFacilityCode)).length;

  return (
    <div className="grid gap-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Referrals Created" value={created} sub="sent to pool" />
        <StatCard
          label="Accepted"
          value={accepted}
          sub="picked up by your facility"
          accent="var(--chart-1)"
        />
        <StatCard
          label="Direct Referrals"
          value={directCount}
          sub="created & placed"
          accent="var(--chart-2)"
        />
        <StatCard
          label="Open"
          value={openCount}
          sub="awaiting acceptance"
          accent="var(--chart-3)"
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-3 md:grid-cols-2">
        <ChartSection title="Status Distribution">
          <StatusDonutChart referrals={allReferrals} />
        </ChartSection>
        <ChartSection title="By Priority">
          <PriorityBarChart referrals={allReferrals} />
        </ChartSection>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-3 md:grid-cols-2">
        <ChartSection title="Top Service Types">
          <ServiceTypeBarChart referrals={allReferrals} />
        </ChartSection>
        <ChartSection title="Monthly Trend (created)">
          <TrendAreaChart referrals={originReferrals} />
        </ChartSection>
      </div>

      {facilityId && (
        <div className="flex gap-3 flex-wrap">
          <Link
            className="btn btn-ghost org-btn"
            to={`/facilities/${facilityId}/referrals`}
          >
            Manage Referrals →
          </Link>
        </div>
      )}
    </div>
  );
}

