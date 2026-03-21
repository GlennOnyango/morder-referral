import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { fetchDashboardMetrics } from "../api/metrics";
import { useAuthContext } from "../context/AuthContext";

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

function DashboardPage() {
  const { isAuthenticated, session } = useAuthContext();
  const role = session?.role ?? "unknown";
  const canManageOrganizations = role === "admin" || role === "super_admin";
  const canViewMetrics = role === "super_admin";
  const isRolePending = role === "unknown";

  const dashboardQuery = useQuery({
    queryKey: ["dashboard-metrics", session?.accessToken],
    queryFn: () => fetchDashboardMetrics(session?.accessToken),
    enabled: isAuthenticated && canViewMetrics,
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
          <strong>{role}</strong>.
        </p>
      </div>

      {isRolePending ? (
        <article className="access-note">
          <h2>Role pending</h2>
          <p>Wait for admin to give you a role to be able to access the system.</p>
        </article>
      ) : null}

      {!canViewMetrics && !isRolePending ? (
        <article className="access-note">
          <h2>Restricted dashboard</h2>
          <p>Only `super_admin` users can view organization, service, and patient metrics.</p>
        </article>
      ) : null}

      {canViewMetrics && dashboardQuery.isLoading ? (
        <article className="access-note">
          <h2>Loading metrics</h2>
          <p>Pulling organization, service, and patient data...</p>
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
            title="Organization Metrics"
            items={dashboardQuery.data.organizationMetrics}
            action={
              canManageOrganizations
                ? {
                    label: "View organizations",
                    to: "/organizations",
                  }
                : undefined
            }
          />
          <MetricCard title="Service Metrics" items={dashboardQuery.data.serviceMetrics} />
          <MetricCard title="Patient Metrics" items={dashboardQuery.data.patientMetrics} />
        </div>
      ) : null}
    </section>
  );
}

export default DashboardPage;
