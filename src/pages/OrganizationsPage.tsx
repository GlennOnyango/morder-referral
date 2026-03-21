import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Link, Navigate } from "react-router-dom";
import { listOrganizations } from "../api/organizations";
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

function OrganizationsPage() {
  const { session, isAuthenticated } = useAuthContext();
  const role = session?.role ?? "unknown";
  const canManageOrganizations = role === "admin" || role === "super_admin";

  const organizationsQuery = useQuery({
    queryKey: ["organizations", session?.accessToken],
    queryFn: () => listOrganizations(session?.accessToken),
    enabled: isAuthenticated && canManageOrganizations,
  });

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  return (
    <section className="org-shell reveal delay-1">
      <div className="org-header">
        <div>
          <p className="eyebrow">Organizations</p>
          <h1>Manage organizations</h1>
          <p>View and update organizations, then open each organization workspace for services, users, and patients.</p>
        </div>
        {canManageOrganizations ? (
          <Link className="btn btn-primary" to="/organizations/new">
            Create Organization
          </Link>
        ) : null}
      </div>

      {!canManageOrganizations ? (
        <article className="access-note">
          <h2>Restricted organizations module</h2>
          <p>Only users with the `admin` role can manage organizations.</p>
        </article>
      ) : null}

      {canManageOrganizations && organizationsQuery.isLoading ? (
        <article className="access-note">
          <h2>Loading organizations</h2>
          <p>Fetching latest organization data...</p>
        </article>
      ) : null}

      {canManageOrganizations && organizationsQuery.isError ? (
        <article className="access-note error-block">
          <h2>Could not load organizations</h2>
          <p>{formatError(organizationsQuery.error)}</p>
        </article>
      ) : null}

      {canManageOrganizations && organizationsQuery.data ? (
        <article className="org-table-card">
          {organizationsQuery.data.length === 0 ? (
            <p className="org-empty">No organizations found. Create the first one.</p>
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
                    const organizationName = organization.name ?? "Unnamed";

                    return (
                      <tr key={organizationId || organizationName}>
                        <td>
                          {organizationId ? (
                            <Link className="org-link" to={`/organizations/${organizationId}`}>
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
                              <Link className="btn btn-ghost org-btn" to={`/organizations/${organizationId}/edit`}>
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
