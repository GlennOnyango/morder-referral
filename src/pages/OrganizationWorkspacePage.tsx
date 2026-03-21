import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Link, Navigate, useParams } from "react-router-dom";
import { listFacilityUsers } from "../api/authAdmin";
import { getOrganizationById } from "../api/organizations";
import { listPatients } from "../api/patients";
import { listOrganizationServices } from "../api/services";
import { useAuthContext } from "../context/AuthContext";

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
  const role = session?.role ?? "unknown";
  const canManageOrganizations = role === "admin" || role === "super_admin";

  const organizationQuery = useQuery({
    queryKey: ["organizations", "detail", organizationId, session?.accessToken],
    queryFn: () => getOrganizationById(organizationId, session?.accessToken),
    enabled: canManageOrganizations && organizationId.length > 0,
  });

  const servicesQuery = useQuery({
    queryKey: ["organizations", organizationId, "services", session?.accessToken],
    queryFn: () => listOrganizationServices(organizationId, session?.accessToken),
    enabled: canManageOrganizations && organizationId.length > 0,
  });

  const facilityCode = organizationQuery.data?.facility_code?.trim() ?? "";

  const usersQuery = useQuery({
    queryKey: ["organization-users", organizationId, facilityCode, "all", session?.accessToken],
    queryFn: () => listFacilityUsers(facilityCode, "all", session?.accessToken),
    enabled: canManageOrganizations && facilityCode.length > 0,
  });

  const patientsQuery = useQuery({
    queryKey: ["patients", organizationId, session?.accessToken],
    queryFn: () => listPatients(undefined, session?.accessToken),
    enabled: canManageOrganizations && organizationId.length > 0,
  });

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  if (!canManageOrganizations) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
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

  const patientsCount =
    patientsQuery.isLoading
      ? "..."
      : patientsQuery.isError
        ? "n/a"
        : patientsQuery.data?.length ?? 0;

  return (
    <section className="org-shell reveal delay-1">
      <div className="org-header">
        <div>
          <p className="eyebrow">Organizations</p>
          <h1>
            {organizationQuery.data?.name ?? (organizationQuery.isLoading ? "Loading organization..." : "Organization")}
          </h1>
          <p>Organization workspace with high-level statistics and quick actions.</p>
        </div>
        <div className="org-actions">
          <Link className="btn btn-ghost org-btn" to="/organizations">
            Back to Organizations
          </Link>
          <Link className="btn btn-ghost org-btn" to={`/organizations/${organizationId}/edit`}>
            Edit Organization
          </Link>
        </div>
      </div>

      {organizationQuery.isError ? (
        <article className="access-note error-block">
          <h2>Could not load organization</h2>
          <p>{formatError(organizationQuery.error)}</p>
        </article>
      ) : null}

      <section className="org-stat-grid">
        <StatCard
          title="Services"
          value={servicesCount}
          description="Total services configured for this organization."
          actionLabel="Open Services"
          actionTo={`/organizations/${organizationId}/services`}
        />
        <StatCard
          title="Users"
          value={usersCount}
          description="Users discovered from the facility user registry."
          actionLabel="Open Users"
          actionTo={`/organizations/${organizationId}/users`}
        />
        <StatCard
          title="Patients"
          value={patientsCount}
          description="Current patient records available in the patient service."
          actionLabel="Open Patients"
          actionTo={`/organizations/${organizationId}/patients`}
        />
        <StatCard
          title="Referrals"
          value="Coming soon"
          description="Referral statistics will appear here when referral APIs are integrated."
        />
      </section>

      {servicesQuery.isError ? (
        <p className="result-note error-note">Services stats failed: {formatError(servicesQuery.error)}</p>
      ) : null}

      {usersQuery.isError ? (
        <p className="result-note error-note">Users stats failed: {formatError(usersQuery.error)}</p>
      ) : null}

      {patientsQuery.isError ? (
        <p className="result-note error-note">Patients stats failed: {formatError(patientsQuery.error)}</p>
      ) : null}
    </section>
  );
}

export default OrganizationWorkspacePage;
