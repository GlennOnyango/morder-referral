import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Link, Navigate, useParams } from "react-router-dom";
import { listFacilityUsers } from "../../api/authAdmin";
import { getOrganizationById } from "../../api/organizations";
import { listOrganizationServices } from "../../api/services";
import Breadcrumbs from "../../components/Breadcrumbs";
import { useAuthContext } from "../../context/AuthContext";
import { canAccessOrganization, canManageFacilityCatalog, isFacilityManager } from "../../utils/facilityAccess";

function formatError(error: unknown): string {
  if (isAxiosError(error)) {
    const payload = error.response?.data;
    if (payload && typeof payload === "object" && "message" in payload) {
      const value = (payload as { message?: unknown }).message;
      if (typeof value === "string") {
        return value;
      }
    }
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Request failed. Please try again.";
}

type StatCardProps = {
  title: string;
  value: string | number;
  description: string;
  actionLabel?: string;
  actionTo?: string;
};

function StatCard({ title, value, description, actionLabel, actionTo }: StatCardProps) {
  return (
    <article className="org-stat-card">
      <p className="org-stat-label">{title}</p>
      <strong>{value}</strong>
      <p className="org-stat-note">{description}</p>
      {actionLabel && actionTo ? (
        <Link className="btn btn-ghost org-btn" to={actionTo}>
          {actionLabel}
        </Link>
      ) : null}
    </article>
  );
}

function OrganizationWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const organizationId = id ?? "";
  const { session, isAuthenticated } = useAuthContext();
  const role = session?.role;
  const canManageOrganizations = isFacilityManager(role);
  const canEditFacility = canManageFacilityCatalog(role);

  const organizationQuery = useQuery({
    queryKey: ["organizations", "detail", organizationId, session?.accessToken],
    queryFn: () => getOrganizationById(organizationId, session?.accessToken),
    enabled: canManageOrganizations && organizationId.length > 0,
  });

  const servicesQuery = useQuery({
    queryKey: ["organizations", organizationId, "services", session?.accessToken],
    queryFn: () => listOrganizationServices(organizationId, session?.accessToken),
    enabled:
      canManageOrganizations &&
      organizationId.length > 0 &&
      canAccessOrganization(role, session?.facilityId, organizationQuery.data),
  });

  const facilityCode = organizationQuery.data?.facility_code?.trim() ?? "";

  const usersQuery = useQuery({
    queryKey: ["organization-users", organizationId, facilityCode, "all", session?.accessToken],
    queryFn: () => listFacilityUsers(facilityCode, "all", session?.accessToken),
    enabled:
      canManageOrganizations &&
      facilityCode.length > 0 &&
      canAccessOrganization(role, session?.facilityId, organizationQuery.data),
  });

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  if (!canManageOrganizations) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!organizationId) {
    return <Navigate to="/facilities" replace />;
  }

  if (role === "HOSPITAL_ADMIN" && !session?.facilityId) {
    return <Navigate to="/dashboard" replace />;
  }

  if (organizationQuery.data && !canAccessOrganization(role, session?.facilityId, organizationQuery.data)) {
    return <Navigate to="/dashboard" replace />;
  }

  const servicesCount =
    servicesQuery.isLoading
      ? "..."
      : servicesQuery.isError
        ? "n/a"
        : servicesQuery.data?.length ?? 0;

  const usersCount =
    facilityCode.length === 0
      ? "n/a"
      : usersQuery.isLoading
        ? "..."
        : usersQuery.isError
          ? "n/a"
          : usersQuery.data?.length ?? 0;
  const facilityName =
    organizationQuery.data?.name ?? organizationQuery.data?.facility_code ?? "Facility";

  return (
    <section className="org-shell reveal delay-1">
      <div className="org-header">
        <div>
          <p className="eyebrow">Facilities</p>
          <h1>
            {organizationQuery.data?.name ?? (organizationQuery.isLoading ? "Loading facility..." : "Facility")}
          </h1>
          <p>Facility workspace with high-level statistics and quick actions.</p>
        </div>
        <div className="org-actions">
          
          {canEditFacility ? (
            <Link className="btn btn-ghost org-btn" to={`/facilities/${organizationId}/edit`}>
              Edit Facility
            </Link>
          ) : null}
        </div>
      </div>

      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: "Dashboard", to: "/dashboard" },
          { label: "Facilities", to: "/facilities" },
          { label: facilityName },
        ]}
      />

      {organizationQuery.isError ? (
        <article className="access-note error-block">
          <h2>Could not load facility</h2>
          <p>{formatError(organizationQuery.error)}</p>
        </article>
      ) : null}

      <section className="org-stat-grid">
        <StatCard
          title="Services"
          value={servicesCount}
          description="Total services configured for this facility."
          actionLabel="Open Services"
          actionTo={`/facilities/${organizationId}/services`}
        />
        <StatCard
          title="Users"
          value={usersCount}
          description="Users discovered from the facility user registry."
          actionLabel="Open Users"
          actionTo={`/facilities/${organizationId}/users`}
        />
        <StatCard
          title="Referrals"
          value="Manage"
          description="Open your facility referrals workspace."
          actionLabel="Open Referrals"
          actionTo={`/facilities/${organizationId}/referrals`}
        />
      </section>

      {servicesQuery.isError ? (
        <p className="result-note error-note">Services stats failed: {formatError(servicesQuery.error)}</p>
      ) : null}

      {usersQuery.isError ? (
        <p className="result-note error-note">Users stats failed: {formatError(usersQuery.error)}</p>
      ) : null}
    </section>
  );
}

export default OrganizationWorkspacePage;

