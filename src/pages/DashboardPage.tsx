import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { fetchDashboardMetrics } from "../api/metrics";
import { listOrganizations } from "../api/organizations";
import { listFacilityReferrals, listReferralPool } from "../api/referrals";
import Breadcrumbs from "../components/Breadcrumbs";
import { useAuthContext } from "../context/AuthContext";
import { isFacilityManager, isOrganizationOwnedBySessionFacility } from "../utils/facilityAccess";

function MetricCard({
  title,
  items,
  action,
}: {
  title: string;
  items: { label: string; value: string | number }[];
  action?: { label: string; to: string };
}) {
  return (
    <article className="metric-card">
      <h2>{title}</h2>
      <ul>
        {items.map((item) => (
          <li key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </li>
        ))}
      </ul>
      {action ? (
        <div className="metric-card-action">
          <Link className="btn btn-ghost org-btn" to={action.to}>
            {action.label}
          </Link>
        </div>
      ) : null}
    </article>
  );
}

function ActionCard({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions: { label: string; to: string }[];
}) {
  return (
    <article className="metric-card facility-operations-card">
      <h2>{title}</h2>
      <p className="facility-operations-description">{description}</p>
      <div className="facility-operations-actions">
        {actions.map((action) => (
          <Link key={action.to} className="btn btn-ghost org-btn facility-operations-btn" to={action.to}>
            {action.label}
          </Link>
        ))}
      </div>
    </article>
  );
}

function countBy(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((accumulator, value) => {
    const key = value.trim().toLowerCase();
    if (!key) {
      return accumulator;
    }

    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});
}

function pickTopLabel(counts: Record<string, number>, fallback: string): string {
  const entries = Object.entries(counts);
  if (entries.length === 0) {
    return fallback;
  }

  entries.sort((a, b) => b[1] - a[1]);
  const [label, count] = entries[0];
  return `${label} (${count})`;
}

function DashboardPage() {
  const { isAuthenticated, session } = useAuthContext();
  const role = session?.role;
  const canManageFacilities = role === "HOSPITAL_ADMIN" || role === "SUPER_ADMIN";
  const canViewMetrics = role === "SUPER_ADMIN";
  const canViewReferralMetrics = isFacilityManager(role);
  const isHospitalAdmin = role === "HOSPITAL_ADMIN";
  const isRolePending = !role;

  const dashboardQuery = useQuery({
    queryKey: ["dashboard-metrics", session?.accessToken],
    queryFn: () => fetchDashboardMetrics(session?.accessToken),
    enabled: isAuthenticated && canViewMetrics,
  });

  const hospitalFacilityQuery = useQuery({
    queryKey: ["dashboard-hospital-admin-facility", session?.accessToken, session?.facilityId],
    queryFn: async () => {
      const organizations = await listOrganizations(session?.accessToken);
      return (
        organizations.find((organization) =>
          isOrganizationOwnedBySessionFacility(organization, session?.facilityId),
        ) ?? null
      );
    },
    enabled: isAuthenticated && isHospitalAdmin && Boolean(session?.facilityId),
  });

  const hospitalFacilityId = hospitalFacilityQuery.data?.id ?? "";
  const hospitalFacilityCode = hospitalFacilityQuery.data?.facility_code?.trim() ?? "";
  const hospitalFacilityName =
    hospitalFacilityQuery.data?.name ?? hospitalFacilityQuery.data?.facility_code ?? "Assigned facility";

  const referralMetricsQuery = useQuery({
    queryKey: [
      "dashboard-referral-metrics",
      role,
      hospitalFacilityId,
      hospitalFacilityCode,
      session?.accessToken,
    ],
    queryFn: async () => {
      if (role === "HOSPITAL_ADMIN") {
        const facilityReferrals = await listFacilityReferrals(
          hospitalFacilityCode,
          { limit: 1000, offset: 0 },
          session?.accessToken,
        );
        const statusCounts = countBy(facilityReferrals.map((referral) => referral.status ?? ""));
        const serviceTypeCounts = countBy(facilityReferrals.map((referral) => referral.serviceType ?? ""));

        return {
          title: "Referral Metrics",
          items: [
            { label: "Facility Referrals", value: facilityReferrals.length },
            { label: "Open Referrals", value: statusCounts.open ?? 0 },
            { label: "Accepted Referrals", value: statusCounts.accepted ?? 0 },
            { label: "Top Service Type", value: pickTopLabel(serviceTypeCounts, "n/a") },
          ],
          action: hospitalFacilityId
            ? {
                label: "View Facility Referrals",
                to: `/facilities/${hospitalFacilityId}/referrals/facility`,
              }
            : undefined,
        };
      }

      const poolReferrals = await listReferralPool({ limit: 1000, offset: 0 }, session?.accessToken);
      const priorityCounts = countBy(poolReferrals.map((referral) => referral.priority ?? ""));
      const serviceTypeCounts = countBy(poolReferrals.map((referral) => referral.serviceType ?? ""));

      return {
        title: "Referral Metrics",
        items: [
          { label: "Open Pool Referrals", value: poolReferrals.length },
          { label: "Most Common Priority", value: pickTopLabel(priorityCounts, "n/a") },
          { label: "Top Service Type", value: pickTopLabel(serviceTypeCounts, "n/a") },
        ],
      };
    },
    enabled:
      isAuthenticated &&
      canViewReferralMetrics &&
      (role !== "HOSPITAL_ADMIN" || Boolean(hospitalFacilityCode)),
  });

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  return (
    <section className="dashboard-shell reveal delay-1">
      <div className="dashboard-heading">
        <p className="eyebrow">Dashboard</p>
        <h1>Referral intelligence overview</h1>
        <p className="dashboard-meta">
          Signed in as <strong>{session?.email ?? "Unknown user"}</strong> with role{" "}
          <strong>{role ?? "UNASSIGNED"}</strong>.
        </p>
      </div>

      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: "Dashboard" },
        ]}
      />

      {isRolePending ? (
        <article className="access-note">
          <h2>Role pending</h2>
          <p>Wait for a SUPER_ADMIN to assign your role before accessing restricted modules.</p>
        </article>
      ) : null}

      {!canViewMetrics && !isRolePending ? (
        <article className="access-note">
          <h2>Scoped dashboard</h2>
          <p>Your dashboard is scoped to your assigned facility operations.</p>
        </article>
      ) : null}

      {isHospitalAdmin && !session?.facilityId ? (
        <article className="access-note error-block">
          <h2>Missing facility assignment</h2>
          <p>Could not resolve your `facility_id` from token claims. Sign in again or contact support.</p>
        </article>
      ) : null}

      {isHospitalAdmin && session?.facilityId && hospitalFacilityQuery.isLoading ? (
        <article className="access-note">
          <h2>Loading facility access</h2>
          <p>Resolving your assigned facility and actions...</p>
        </article>
      ) : null}

      {isHospitalAdmin && session?.facilityId && hospitalFacilityQuery.isError ? (
        <article className="access-note error-block">
          <h2>Could not load facility access</h2>
          <p>
            {hospitalFacilityQuery.error instanceof Error
              ? hospitalFacilityQuery.error.message
              : "Unknown error"}
          </p>
        </article>
      ) : null}

      {isHospitalAdmin && session?.facilityId && !hospitalFacilityQuery.isLoading && !hospitalFacilityId ? (
        <article className="access-note error-block">
          <h2>Assigned facility not found</h2>
          <p>We could not match your `facility_id` to a facility record.</p>
        </article>
      ) : null}

      {isHospitalAdmin && hospitalFacilityId ? (
        <div className="metric-grid facility-operations-grid">
          <ActionCard
            title="Facility Operations"
            description={`Manage services, users, referrals, and details for ${hospitalFacilityName}.`}
            actions={[
              { label: "View Facility", to: `/facilities/${hospitalFacilityId}` },
              { label: "Manage Services", to: `/facilities/${hospitalFacilityId}/services` },
              { label: "Manage Users", to: `/facilities/${hospitalFacilityId}/users` },
              { label: "Manage Referrals", to: `/facilities/${hospitalFacilityId}/referrals` },
            ]}
          />
          {referralMetricsQuery.data ? (
            <MetricCard
              title={referralMetricsQuery.data.title}
              items={referralMetricsQuery.data.items}
              action={referralMetricsQuery.data.action}
            />
          ) : null}
        </div>
      ) : null}

      {canViewReferralMetrics && referralMetricsQuery.isLoading ? (
        <article className="access-note">
          <h2>Loading referral metrics</h2>
          <p>Pulling referral data for your dashboard...</p>
        </article>
      ) : null}

      {canViewReferralMetrics && referralMetricsQuery.isError ? (
        <article className="access-note error-block">
          <h2>Could not load referral metrics</h2>
          <p>{referralMetricsQuery.error instanceof Error ? referralMetricsQuery.error.message : "Unknown error"}</p>
        </article>
      ) : null}

      {canViewMetrics && dashboardQuery.isLoading ? (
        <article className="access-note">
          <h2>Loading metrics</h2>
          <p>Pulling facility and service data...</p>
        </article>
      ) : null}

      {canViewMetrics && dashboardQuery.isError ? (
        <article className="access-note error-block">
          <h2>Could not load dashboard metrics</h2>
          <p>{dashboardQuery.error instanceof Error ? dashboardQuery.error.message : "Unknown error"}</p>
        </article>
      ) : null}

      {canViewMetrics && dashboardQuery.data ? (
        <div className="metric-grid">
          <MetricCard
            title="Facility Metrics"
            items={dashboardQuery.data.organizationMetrics}
            action={
              canManageFacilities
                ? {
                  label: "View facilities",
                  to: "/facilities",
                }
                : undefined
            }
          />
          <MetricCard title="Service Metrics" items={dashboardQuery.data.serviceMetrics} />
          {referralMetricsQuery.data ? (
            <MetricCard
              title={referralMetricsQuery.data.title}
              items={referralMetricsQuery.data.items}
              action={referralMetricsQuery.data.action}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export default DashboardPage;
