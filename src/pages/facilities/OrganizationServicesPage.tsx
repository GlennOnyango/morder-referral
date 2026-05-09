import {
  type ColumnDef,
} from "@tanstack/react-table";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { useQueryClient } from "@tanstack/react-query";
import { formatError } from "../../utils/format";
import { Link, Navigate } from "react-router-dom";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useGetOrganizationById } from "../../api/hooks/organizations/OrganizationById.hook";
import { useGetOrganizationServices } from "../../api/hooks/services/OrganizationServices.hook";
import { useDeleteService } from "../../api/hooks/services/DeleteService.hook";
import Breadcrumbs from "../../components/Breadcrumbs";
import DataTable from "../../components/DataTable";
import { useAuthContext } from "../../context/useAuthContext";
import { canAccessOrganization, isFacilityManager } from "../../utils/facilityAccess";

type OrganizationServiceRow = {
  id: string;
  serviceName: string;
  availability: string;
  notes: string;
};

function OrganizationServicesPage() {
  const { workspaceId: organizationId } = useWorkspace();
  const { session, isAuthenticated } = useAuthContext();
  const roles = session?.roles ?? [];
  const canManageOrganizations = isFacilityManager(roles);
  const queryClient = useQueryClient();

  const organizationQuery = useGetOrganizationById(organizationId, session?.accessToken, {
    enabled: canManageOrganizations && organizationId.length > 0,
  });

  const servicesQuery = useGetOrganizationServices(organizationId, session?.accessToken, {
    enabled:
      canManageOrganizations &&
      organizationId.length > 0 &&
      canAccessOrganization(roles, session?.facilityId, organizationQuery.data),
  });

  const deleteMutation = useDeleteService(session?.accessToken, {
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["services", "list", organizationId] });
      await queryClient.invalidateQueries({ queryKey: ["metrics", "dashboard"] });
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
  const services = Array.isArray(servicesQuery.data) ? servicesQuery.data : [];

  const serviceRows: OrganizationServiceRow[] = services.map((service) => ({
    id: String(service.id ?? service.service_name ?? ""),
    serviceName: service.service_name ?? "Unnamed service",
    availability: service.availability ?? "-",
    notes: service.notes ?? "-",
  }));

  const columns: ColumnDef<OrganizationServiceRow>[] = [
    {
      accessorKey: "serviceName",
      header: "Service Name",
    },
    {
      accessorKey: "availability",
      header: "Availability",
    },
    {
      accessorKey: "notes",
      header: "Notes",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const serviceId = row.original.id;
        const serviceName = row.original.serviceName;
        return (
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
        );
      },
    },
  ];

  return (
    <section className="org-shell reveal delay-1">
      <Card>
        <CardContent className="flex items-end justify-between gap-3 px-5 py-4">
          <div className="flex flex-col gap-1">
            <p className="eyebrow">Services</p>
            <h1 className="font-heading text-2xl font-semibold -tracking-[0.03em] text-slate-900 sm:text-3xl">
              Manage Services:{" "}
              {organizationQuery.data?.name ?? (organizationQuery.isLoading ? "Loading..." : "Facility")}
            </h1>
            <p className="text-sm text-slate-500">View facility services and open a dedicated page to create or update them.</p>
          </div>
          <Link className="btn btn-primary" to={`/${organizationId}/services/create`}>
            Create Service
          </Link>
        </CardContent>
      </Card>

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
            <DataTable
              data={serviceRows}
              columns={columns}
              emptyMessage="No services found for this facility."
              resultLabel="service"
            />
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
