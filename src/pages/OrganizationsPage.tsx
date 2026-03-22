import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Link, Navigate } from "react-router-dom";
import { listOrganizations } from "../api/organizations";
import Breadcrumbs from "../components/Breadcrumbs";
import { useAuthContext } from "../context/AuthContext";
import {
  canManageFacilityCatalog,
  isFacilityManager,
  isOrganizationOwnedBySessionFacility,
} from "../utils/facilityAccess";

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

function OrganizationsPage() {
  const { session, isAuthenticated } = useAuthContext();
  const role = session?.role;
  const canManageOrganizations = isFacilityManager(role);
  const canManageCatalog = canManageFacilityCatalog(role);

  const organizationsQuery = useQuery({
    queryKey: ["organizations", session?.accessToken],
    queryFn: () => listOrganizations(session?.accessToken),
    enabled: isAuthenticated && canManageOrganizations,
  });
  const scopedOrganization =
    role === "HOSPITAL_ADMIN" && organizationsQuery.data
      ? organizationsQuery.data.find((organization) =>
          isOrganizationOwnedBySessionFacility(organization, session?.facilityId),
        )
      : undefined;

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  if (role === "HOSPITAL_ADMIN") {
    if (!session?.facilityId) {
      return (
        <section className="org-shell reveal delay-1">
          <article className="access-note error-block">
            <h2>Missing facility assignment</h2>
            <p>Could not resolve your `facility_id` from token claims. Sign in again or contact support.</p>
          </article>
        </section>
      );
    }

    if (organizationsQuery.isLoading) {
      return (
        <section className="org-shell reveal delay-1">
          <article className="access-note">
            <h2>Loading facility</h2>
            <p>Resolving your assigned facility...</p>
          </article>
        </section>
      );
    }

    if (organizationsQuery.isError) {
      return (
        <section className="org-shell reveal delay-1">
          <article className="access-note error-block">
            <h2>Could not load facility</h2>
            <p>{formatError(organizationsQuery.error)}</p>
          </article>
        </section>
      );
    }

    if (scopedOrganization?.id) {
      return <Navigate to={`/facilities/${scopedOrganization.id}`} replace />;
    }

    return (
      <section className="org-shell reveal delay-1">
        <article className="access-note error-block">
          <h2>Assigned facility not found</h2>
          <p>We could not match your assigned facility to an organization record.</p>
        </article>
      </section>
    );
  }

  return (
    <section className="org-shell reveal delay-1">
      <div className="org-header">
        <div>
          <p className="eyebrow">Facilities</p>
          <h1>Manage facilities</h1>
          <p>View and update facilities, then open each facility workspace for services, users, and patients.</p>
        </div>
        {canManageCatalog ? (
          <Link className="btn btn-primary" to="/facilities/new">
            Create Facility
          </Link>
        ) : null}
      </div>

      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: "Dashboard", to: "/dashboard" },
          { label: "Facilities" },
        ]}
      />

      {!canManageOrganizations ? (
        <article className="access-note">
          <h2>Restricted facilities module</h2>
          <p>Only users with `HOSPITAL_ADMIN` or `SUPER_ADMIN` role can manage facilities.</p>
        </article>
      ) : null}

      {canManageOrganizations && organizationsQuery.isLoading ? (
        <article className="access-note">
          <h2>Loading facilities</h2>
          <p>Fetching latest facility data...</p>
        </article>
      ) : null}

      {canManageOrganizations && organizationsQuery.isError ? (
        <article className="access-note error-block">
          <h2>Could not load facilities</h2>
          <p>{formatError(organizationsQuery.error)}</p>
        </article>
      ) : null}

      {canManageOrganizations && organizationsQuery.data ? (
        <article className="org-table-card">
          {organizationsQuery.data.length === 0 ? (
            <p className="org-empty">No facilities found. Create the first one.</p>
          ) : (
            <div className="org-table-wrap">
              <table className="org-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Facility Code</th>
                    <th>County</th>
                    <th>Level</th>
                    <th>Ownership</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {organizationsQuery.data.map((organization) => {
                    const organizationId = organization.id ?? "";
                    const organizationName = organization.name ?? "Unnamed facility";

                    return (
                      <tr key={organizationId || organizationName}>
                        <td>
                          {organizationId ? (
                            <Link className="org-link" to={`/facilities/${organizationId}`}>
                              {organizationName}
                            </Link>
                          ) : (
                            organizationName
                          )}
                        </td>
                        <td>{organization.facility_code ?? "-"}</td>
                        <td>{organization.county ?? "-"}</td>
                        <td>{organization.level ?? "-"}</td>
                        <td>{organization.ownership_type ?? "-"}</td>
                        <td>
                          <div className="org-actions">
                            {organizationId ? (
                              <Link className="btn btn-ghost org-btn" to={`/facilities/${organizationId}/edit`}>
                                Edit
                              </Link>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </article>
      ) : null}
    </section>
  );
}

export default OrganizationsPage;


