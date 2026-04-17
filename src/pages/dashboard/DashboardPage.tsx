import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { fetchDashboardMetrics } from "../../api/metrics";
import { listOrganizations } from "../../api/organizations";
import { listFacilityReferrals, listReferralPool } from "../../api/referrals";
import Breadcrumbs from "../../components/Breadcrumbs";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../../components/ui/chart";
import { Card } from "../../components/ui/card";
import { useAuthContext } from "../../context/AuthContext";
import type { ModelsReferral } from "../../types/referrals.generated";
import { isOrganizationOwnedBySessionFacility } from "../../utils/facilityAccess";

// ─── Palette ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  open: "var(--chart-2)",
  accepted: "var(--chart-1)",
  cancelled: "var(--chart-4)",
  closed: "var(--chart-5)",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "var(--chart-4)",
  urgent: "#b43b33",
  medium: "var(--chart-3)",
  low: "var(--chart-1)",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function countBy(items: string[]): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, v) => {
    const key = v.trim().toLowerCase();
    if (key) acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function toChartData(counts: Record<string, number>, limit?: number) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const slice = limit ? entries.slice(0, limit) : entries;
  return slice.map(([name, value]) => ({ name, value }));
}

function buildMonthlyTrend(referrals: ModelsReferral[]) {
  const counts: Record<string, number> = {};
  for (const r of referrals) {
    if (!r.createdAt) continue;
    const d = new Date(r.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, count]) => ({
      month: new Date(`${month}-01`).toLocaleString("default", { month: "short", year: "2-digit" }),
      count,
    }));
}

// ─── Stat card ──────────────────────────────────────────────────────────────

function StatCard({
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

// ─── Charts ─────────────────────────────────────────────────────────────────

const statusChartConfig: ChartConfig = {
  open: { label: "Open", color: STATUS_COLORS.open },
  accepted: { label: "Accepted", color: STATUS_COLORS.accepted },
  cancelled: { label: "Cancelled", color: STATUS_COLORS.cancelled },
  closed: { label: "Closed", color: STATUS_COLORS.closed },
};

const trendChartConfig: ChartConfig = {
  count: { label: "Referrals", color: "var(--chart-1)" },
};

function StatusDonut({ referrals }: { referrals: ModelsReferral[] }) {
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

function PriorityBar({ referrals }: { referrals: ModelsReferral[] }) {
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

function ServiceTypeBar({ referrals }: { referrals: ModelsReferral[] }) {
  const data = useMemo(
    () => toChartData(countBy(referrals.map((r) => r.serviceType ?? "unknown")), 6),
    [referrals],
  );

  const config: ChartConfig = { value: { label: "Referrals", color: "var(--chart-2)" } };

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

function TrendArea({ referrals }: { referrals: ModelsReferral[] }) {
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

// ─── Section wrapper ─────────────────────────────────────────────────────────

function ChartSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">{title}</h3>
      {children}
    </Card>
  );
}

// ─── Main referral stats panel ───────────────────────────────────────────────

function ReferralStats({
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
          <StatusDonut referrals={allReferrals} />
        </ChartSection>
        <ChartSection title="By Priority">
          <PriorityBar referrals={allReferrals} />
        </ChartSection>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-3 md:grid-cols-2">
        <ChartSection title="Top Service Types">
          <ServiceTypeBar referrals={allReferrals} />
        </ChartSection>
        <ChartSection title="Monthly Trend (created)">
          <TrendArea referrals={originReferrals} />
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

// ─── Super admin panel ───────────────────────────────────────────────────────

function SuperAdminStats({ referrals }: { referrals: ModelsReferral[] }) {
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
          <StatusDonut referrals={referrals} />
        </ChartSection>
        <ChartSection title="By Priority">
          <PriorityBar referrals={referrals} />
        </ChartSection>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <ChartSection title="Top Service Types">
          <ServiceTypeBar referrals={referrals} />
        </ChartSection>
        <ChartSection title="Monthly Trend">
          <TrendArea referrals={referrals} />
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

// ─── Page ────────────────────────────────────────────────────────────────────

function DashboardPage() {
  const { isAuthenticated, session } = useAuthContext();
  const role = session?.role;
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isHospitalAdmin = role === "HOSPITAL_ADMIN";
  const isRolePending = !role;

  // ── facility context (hospital admin) ──
  const hospitalFacilityQuery = useQuery({
    queryKey: ["dashboard-hospital-admin-facility", session?.accessToken, session?.facilityId],
    queryFn: async () => {
      const orgs = await listOrganizations(session?.accessToken);
      return (
        orgs.find((o) => isOrganizationOwnedBySessionFacility(o, session?.facilityId)) ?? null
      );
    },
    enabled: isAuthenticated && isHospitalAdmin && Boolean(session?.facilityId),
  });

  const facilityCode = hospitalFacilityQuery.data?.facility_code?.trim() ?? "";
  const facilityId = hospitalFacilityQuery.data?.id?.trim() ?? "";

  // ── origin referrals (hospital admin) ──
  const originReferralsQuery = useQuery({
    queryKey: ["dashboard-origin-referrals", facilityCode, session?.accessToken],
    queryFn: () =>
      listFacilityReferrals(facilityCode, { role: "origin", limit: 1000, offset: 0 }, session?.accessToken),
    enabled: isAuthenticated && isHospitalAdmin && Boolean(facilityCode),
  });

  // ── accepted referrals (hospital admin) ──
  const acceptedReferralsQuery = useQuery({
    queryKey: ["dashboard-accepted-referrals", facilityCode, session?.accessToken],
    queryFn: () =>
      listFacilityReferrals(facilityCode, { role: "accepted", limit: 1000, offset: 0 }, session?.accessToken),
    enabled: isAuthenticated && isHospitalAdmin && Boolean(facilityCode),
  });

  // ── pool referrals (super admin) ──
  const poolReferralsQuery = useQuery({
    queryKey: ["dashboard-pool-referrals", session?.accessToken],
    queryFn: () => listReferralPool({ limit: 1000, offset: 0 }, session?.accessToken),
    enabled: isAuthenticated && isSuperAdmin,
  });

  // ── org/service metrics (super admin) ──
  const dashboardQuery = useQuery({
    queryKey: ["dashboard-metrics", session?.accessToken],
    queryFn: () => fetchDashboardMetrics(session?.accessToken),
    enabled: isAuthenticated && isSuperAdmin,
  });

  if (!isAuthenticated) return <Navigate to="/signin" replace />;

  const hospitalStatsLoading =
    isHospitalAdmin &&
    (hospitalFacilityQuery.isLoading ||
      originReferralsQuery.isLoading ||
      acceptedReferralsQuery.isLoading);

  const hospitalStatsError =
    isHospitalAdmin &&
    Boolean(hospitalFacilityQuery.isError || originReferralsQuery.isError || acceptedReferralsQuery.isError);

  return (
    <section className="dashboard-shell reveal delay-1">
      <div className="dashboard-heading">
        <p className="eyebrow">Dashboard</p>
        <h1>Referral Operations</h1>
        <p className="dashboard-meta">
          Track referral flow, status, and facility activity in one place.
        </p>
      </div>

      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Dashboard" }]} />

      {isRolePending && (
        <article className="access-note">
          <h2>Role pending</h2>
          <p>Wait for a SUPER_ADMIN to assign your role before accessing restricted modules.</p>
        </article>
      )}

      {isHospitalAdmin && !session?.facilityId && (
        <article className="access-note error-block">
          <h2>Missing facility assignment</h2>
          <p>Could not resolve your facility_id from token claims. Sign in again or contact support.</p>
        </article>
      )}

      {hospitalStatsLoading && (
        <article className="access-note">
          <h2>Loading dashboard</h2>
          <p>Fetching your facility's referral data…</p>
        </article>
      )}

      {hospitalStatsError && (
        <article className="access-note error-block">
          <h2>Could not load dashboard data</h2>
          <p>Check your connection or sign in again.</p>
        </article>
      )}

      {/* ── Hospital admin stats ── */}
      {isHospitalAdmin &&
        !hospitalStatsLoading &&
        !hospitalStatsError &&
        facilityId && (
          <ReferralStats
            originReferrals={originReferralsQuery.data ?? []}
            acceptedReferrals={acceptedReferralsQuery.data ?? []}
            facilityId={facilityId}
          />
        )}

      {/* ── Super admin – facility/service headline numbers ── */}
      {isSuperAdmin && dashboardQuery.data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-2">
          {dashboardQuery.data.organizationMetrics.map((m) => (
            <StatCard key={m.label} label={m.label} value={m.value} />
          ))}
          {dashboardQuery.data.serviceMetrics.map((m) => (
            <StatCard key={m.label} label={m.label} value={m.value} />
          ))}
        </div>
      )}

      {/* ── Super admin – referral charts ── */}
      {isSuperAdmin && poolReferralsQuery.isLoading && (
        <article className="access-note">
          <h2>Loading referral data</h2>
          <p>Pulling pool referrals for your dashboard…</p>
        </article>
      )}

      {isSuperAdmin && poolReferralsQuery.isError && (
        <article className="access-note error-block">
          <h2>Could not load referral data</h2>
          <p>{poolReferralsQuery.error instanceof Error ? poolReferralsQuery.error.message : "Unknown error"}</p>
        </article>
      )}

      {isSuperAdmin && poolReferralsQuery.data && (
        <SuperAdminStats referrals={poolReferralsQuery.data} />
      )}
    </section>
  );
}

export default DashboardPage;
