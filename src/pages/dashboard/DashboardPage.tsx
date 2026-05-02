import { Navigate } from "react-router-dom";
import Breadcrumbs from "../../components/Breadcrumbs";
import { useAuthContext } from "../../context/useAuthContext";
import SetupActionCards from "@/components/SetUpActionCards";
import StatCard from "@/components/StatCard";
import ServiceAdminStats from "@/components/ServiceAdminStats";
import { useOrganizationServices } from "../../api/hooks/services/OrganizationServices.hook";
import { useDashboardMetrics } from "../../api/hooks/metrics/DashboardMetrics.hook";

function DashboardPage() {
  const { isAuthenticated, session } = useAuthContext();
  const roles = session?.roles ?? [];
  const isSuperAdmin = roles.includes("SUPER_ADMIN");
  const isHospitalAdmin = roles.includes("HOSPITAL_ADMIN");
  const isServiceAdmin = roles.includes("SERVICE_ADMIN");
  const hasFacility = Boolean(session?.facilityId);

  const showSetupOnly = !hasFacility && roles.length === 0;
  const showRolePending = hasFacility && roles.length === 0;
  const showDashboard = roles.length > 0;

  const serviceAdminServicesQuery = useOrganizationServices(
    session?.facilityId ?? "",
    session?.accessToken,
    { enabled: isAuthenticated && isServiceAdmin && Boolean(session?.facilityId) },
  );

  const dashboardQuery = useDashboardMetrics(session?.accessToken, {
    enabled: isAuthenticated && isSuperAdmin,
  });

  if (!isAuthenticated) return <Navigate to="/signin" replace />;

  return (
    <section className="dashboard-shell reveal delay-1">
      <div className="dashboard-heading">
        <p className="eyebrow">Dashboard</p>
        <h1>Referral Operations</h1>
        <p className="dashboard-meta">
          Track referral flow, status, and facility activity in one place.
        </p>
      </div>

      <Breadcrumbs items={[{ label: "Dashboard" }]} />

      {showSetupOnly && <SetupActionCards />}

      {showRolePending && (
        <article className="access-note">
          <h2>Role pending</h2>
          <p>Wait for a SUPER_ADMIN to assign your role before accessing restricted modules.</p>
        </article>
      )}

      {showDashboard && (
        <>
          {isHospitalAdmin && !session?.facilityId && (
            <article className="access-note error-block">
              <h2>Missing facility assignment</h2>
              <p>Could not resolve your facility_id from token claims. Sign in again or contact support.</p>
            </article>
          )}

          {isServiceAdmin && !session?.facilityId && (
            <article className="access-note error-block">
              <h2>Missing facility assignment</h2>
              <p>Could not resolve your organisation from token claims. Sign in again or contact support.</p>
            </article>
          )}

          {isServiceAdmin && serviceAdminServicesQuery.isLoading && (
            <article className="access-note">
              <h2>Loading dashboard</h2>
              <p>Fetching your organisation's service data…</p>
            </article>
          )}

          {isServiceAdmin && serviceAdminServicesQuery.isError && (
            <article className="access-note error-block">
              <h2>Could not load service data</h2>
              <p>
                {serviceAdminServicesQuery.error instanceof Error
                  ? serviceAdminServicesQuery.error.message
                  : "Could not fetch your organisation's services. Check your connection or sign in again."}
              </p>
            </article>
          )}

          {isServiceAdmin && serviceAdminServicesQuery.data && (
            <ServiceAdminStats services={serviceAdminServicesQuery.data} />
          )}

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
        </>
      )}
    </section>
  );
}

export default DashboardPage;
