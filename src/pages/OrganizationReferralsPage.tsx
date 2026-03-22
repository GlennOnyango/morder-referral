import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Link, Navigate, useParams } from "react-router-dom";
import { getOrganizationById } from "../api/organizations";
import { useAuthContext } from "../context/AuthContext";
import { canAccessOrganization, isFacilityManager } from "../utils/facilityAccess";

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

function OrganizationReferralsPage() {
  const { id } = useParams<{ id: string }>();
  const organizationId = id ?? "";
  const { session, isAuthenticated } = useAuthContext();
  const role = session?.role;
  const canManageReferrals = isFacilityManager(role);

  const organizationQuery = useQuery({
    queryKey: ["organizations", "detail", organizationId, session?.accessToken],
    queryFn: () => getOrganizationById(organizationId, session?.accessToken),
    enabled: canManageReferrals && organizationId.length > 0,
  });

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  if (!canManageReferrals) {
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

  return (
    <section className="org-shell reveal delay-1">
      <div className="org-header">
        <div>
          <p className="eyebrow">Referrals</p>
          <h1>
            Manage Referrals:{" "}
            {organizationQuery.data?.name ?? (organizationQuery.isLoading ? "Loading..." : "Facility")}
          </h1>
          <p>Referral management is scoped to this facility.</p>
        </div>
        <div className="org-actions">
          <Link className="btn btn-ghost org-btn" to={`/facilities/${organizationId}`}>
            Workspace
          </Link>
          <Link className="btn btn-ghost org-btn" to={`/facilities/${organizationId}/services`}>
            Services
          </Link>
          <Link className="btn btn-ghost org-btn" to={`/facilities/${organizationId}/users`}>
            Users
          </Link>
          <Link className="btn btn-ghost org-btn" to={`/facilities/${organizationId}/patients`}>
            Patients
          </Link>
          <Link className="btn btn-ghost org-btn" to="/facilities">
            Back to Facilities
          </Link>
        </div>
      </div>

      {organizationQuery.isError ? (
        <article className="access-note error-block">
          <h2>Could not load facility</h2>
          <p>{formatError(organizationQuery.error)}</p>
        </article>
      ) : null}

      <article className="org-form-card">
        <h2>Referrals Workspace</h2>
        <p className="org-section-note">
          Referral APIs are not wired in this frontend yet, but access control is enabled for this facility scope.
        </p>
        <p className="org-section-note">
          Facility code: <strong>{organizationQuery.data?.facility_code ?? "-"}</strong>
        </p>
      </article>
    </section>
  );
}

export default OrganizationReferralsPage;
