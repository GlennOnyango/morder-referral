import { Button } from "../../components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Link, Navigate } from "react-router-dom";
import { useWorkspace } from "../../context/WorkspaceContext";
import { getOrganizationById } from "../../api/organizations";
import { deleteServiceById, listOrganizationServices } from "../../api/services";
import Breadcrumbs from "../../components/Breadcrumbs";
import { useAuthContext } from "../../context/useAuthContext";
import { canAccessOrganization, isFacilityManager } from "../../utils/facilityAccess";

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

function OrganizationServicesPage() {
  const { workspaceId: organizationId } = useWorkspace();
  const { session, isAuthenticated } = useAuthContext();
  const roles = session?.roles ?? [];
  const canManageOrganizations = isFacilityManager(roles);
  const queryClient = useQueryClient();

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
      canAccessOrganization(roles, session?.facilityId, organizationQuery.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (serviceId: string) => deleteServiceById(serviceId, session?.accessToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["organizations", organizationId, "services"],
      });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    },
  });

  const handleDelete = (serviceId: string, serviceName: string) => {
    const shouldDelete = window.confirm(`Delete service "${serviceName}"?`);
    if (!shouldDelete) {
      return;
    }

    deleteMutation.mutate(serviceId);
  };

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  if (!canManageOrganizations) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!organizationId) {
    return <Navigate to="/facilities" replace />;
  }

  if (roles.includes("HOSPITAL_ADMIN") && !session?.facilityId) {
    return <Navigate to={`/${organizationId}/dashboard`} replace />;
  }

  if (organizationQuery.data && !canAccessOrganization(roles, session?.facilityId, organizationQuery.data)) {
    return <Navigate to={`/${organizationId}/dashboard`} replace />;
  }

  const facilityName =
    organizationQuery.data?.name ?? organizationQuery.data?.facility_code ?? "Facility";

  return (
    <section className="org-shell reveal delay-1">
      <div className="org-header">
        <div>
          <p className="eyebrow">Services</p>
          <h1>
            Manage Services:{" "}
            {organizationQuery.data?.name ?? (organizationQuery.isLoading ? "Loading..." : "Facility")}
          </h1>
          <p>View facility services and open a dedicated page to create or update them.</p>
        </div>
        <Link className="btn btn-primary" to={`/${organizationId}/services/create`}>
          Create Service
        </Link>
      </div>

      <Breadcrumbs
        items={[
          { label: facilityName, to: `/${organizationId}/organization` },
          { label: "Services" },
        ]}
      />

      {organizationQuery.isError ? (
        <article className="access-note error-block">
          <h2>Could not load facility</h2>
          <p>{formatError(organizationQuery.error)}</p>
        </article>
      ) : null}

      {servicesQuery.isLoading ? (
        <article className="access-note">
          <h2>Loading services</h2>
          <p>Fetching facility services...</p>
        </article>
      ) : null}

      {servicesQuery.isError ? (
        <article className="access-note error-block">
          <h2>Could not load services</h2>
          <p>{formatError(servicesQuery.error)}</p>
        </article>
      ) : null}

      {Array.isArray(servicesQuery.data) ? (
        <article className="org-table-card">
          {servicesQuery.data.length === 0 ? (
            <p className="org-empty">No services found for this facility.</p>
          ) : (
            <div className="org-table-wrap">
              <table className="org-table">
                <thead>
                  <tr>
                    <th>Service Name</th>
                    <th>Availability</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(servicesQuery.data) ? servicesQuery.data : []).map((service) => {
                    const serviceId = service.id ?? "";
                    const serviceName = service.service_name ?? "Unnamed service";

                    return (
                      <tr key={serviceId || serviceName}>
                        <td>{serviceName}</td>
                        <td>{service.availability ?? "-"}</td>
                        <td>{service.notes ?? "-"}</td>
                        <td>
                          <div className="org-actions">
                            {serviceId ? (
                              <Link
                                className="btn btn-ghost org-btn"
                                to={`/${organizationId}/services/${serviceId}/edit`}
                              >
                                Edit
                              </Link>
                            ) : null}
                            <Button
                              type="button"
                              className="btn btn-outline org-btn"
                              disabled={!serviceId || deleteMutation.isPending}
                              onClick={() => handleDelete(serviceId, serviceName)}
                            >
                              Delete
                            </Button>
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

      {deleteMutation.isError ? (
        <p className="result-note error-note">{formatError(deleteMutation.error)}</p>
      ) : null}
    </section>
  );
}

export default OrganizationServicesPage;
