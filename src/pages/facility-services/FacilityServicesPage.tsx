import {
  type ColumnDef,
} from "@tanstack/react-table";
import { useQueryClient } from "@tanstack/react-query";
import { formatError } from "../../utils/format";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useGetOrganizationById } from "../../api/hooks/organizations/OrganizationById.hook";
import { useGetFacilityServices } from "../../api/hooks/services/FacilityServices.hook";
import { usePostOrganizationService } from "../../api/hooks/services/CreateOrganizationService.hook";
import { useDeleteService } from "../../api/hooks/services/DeleteService.hook";
import Breadcrumbs from "../../components/Breadcrumbs";
import DataTable from "../../components/DataTable";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { useAuthContext } from "../../context/useAuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import { isFacilityManager } from "../../utils/facilityAccess";

type Availability = "available" | "limited" | "unavailable";

const AVAILABILITY_LABELS: Record<Availability, string> = {
  available: "Available",
  limited: "Limited",
  unavailable: "Unavailable",
};

type FacilityServiceRow = {
  id: string;
  serviceId: string;
  serviceName: string;
  availability: string;
  notes: string;
};

function availabilityBadgeClass(a?: string) {
  if (a === "available") return "inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200";
  if (a === "limited") return "inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200";
  return "inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200";
}

function FacilityServicesPage() {
  const { workspaceId: organizationId } = useWorkspace();
  const { session, isAuthenticated, workspaceRoles } = useAuthContext();
  const queryClient = useQueryClient();
  const roles = workspaceRoles;
  const canManage = isFacilityManager(roles);

  const [serviceName, setServiceName] = useState("");
  const [availability, setAvailability] = useState<Availability>("available");
  const [notes, setNotes] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);

  const orgQuery = useGetOrganizationById(organizationId, session?.accessToken, {
    enabled: canManage && organizationId.length > 0,
  });

  const facilityCode = orgQuery.data?.facility_code;

  const servicesQuery = useGetFacilityServices(facilityCode, session?.accessToken, {
    enabled: canManage && Boolean(facilityCode),
  });

  const addServiceMutation = usePostOrganizationService(session?.accessToken, {
    onSuccess: async () => {
      setServiceName("");
      setNotes("");
      setAvailability("available");
      setAddError(null);
      setAddSuccess(true);
      setTimeout(() => setAddSuccess(false), 2000);
      await queryClient.invalidateQueries({ queryKey: ["services", "facility", facilityCode] });
    },
    onError: (err) => {
      setAddSuccess(false);
      setAddError(formatError(err));
    },
  });

  const deleteServiceMutation = useDeleteService(session?.accessToken, {
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["services", "facility", facilityCode] });
    },
  });

  if (!isAuthenticated) return <Navigate to="/signin" replace />;
  if (!canManage) return <Navigate to={`/${organizationId}/dashboard`} replace />;

  const facilityName =
    orgQuery.data?.name ?? orgQuery.data?.facility_code ?? "Facility";

  const services = Array.isArray(servicesQuery.data) ? servicesQuery.data : [];
  const serviceRows: FacilityServiceRow[] = services.map((svc, index) => ({
    id: String(svc.id ?? `${svc.service_name ?? "service"}-${index}`),
    serviceId: String(svc.id ?? ""),
    serviceName: svc.service_name ?? "—",
    availability: svc.availability ?? "—",
    notes: svc.notes ?? "—",
  }));

  const columns: ColumnDef<FacilityServiceRow>[] = [
    {
      accessorKey: "serviceName",
      header: "Service",
      cell: ({ row }) => <span className="font-medium">{row.original.serviceName}</span>,
    },
    {
      accessorKey: "availability",
      header: "Availability",
      cell: ({ row }) => (
        <span className={availabilityBadgeClass(row.original.availability)}>
          {row.original.availability}
        </span>
      ),
    },
    {
      accessorKey: "notes",
      header: "Notes",
      cell: ({ row }) => <span className="text-slate-500">{row.original.notes}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        return (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => {
              if (row.original.serviceId && window.confirm(`Delete "${row.original.serviceName}"?`)) {
                deleteServiceMutation.mutate(row.original.serviceId);
              }
            }}
            disabled={deleteServiceMutation.isPending || !row.original.serviceId}
          >
            Remove
          </Button>
        );
      },
    },
  ];

  const handleAddService = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!serviceName.trim()) {
      setAddError("Service name is required.");
      return;
    }
    setAddError(null);
    setAddSuccess(false);
    addServiceMutation.mutate({
      organizationId,
      payload: { service_name: serviceName.trim(), availability, notes: notes.trim() || undefined },
    });
  };

  return (
    <section className="org-shell reveal delay-1">
      <Card>
        <CardContent className="flex items-end justify-between gap-3 px-5 py-4">
          <div className="flex flex-col gap-1">
            <p className="eyebrow">Facility Services</p>
            <h1 className="font-heading text-2xl font-semibold -tracking-[0.03em] text-slate-900 sm:text-3xl">
              {facilityName}
            </h1>
            <p className="text-sm text-slate-500">
              Manage services offered by this facility.
            </p>
          </div>
        </CardContent>
      </Card>

      <Breadcrumbs
        items={[
          { label: facilityName, to: `/${organizationId}/organization` },
          { label: "Facility Services" },
        ]}
      />

      {orgQuery.isError && (
        <article className="access-note error-block">
          <h2>Could not load facility</h2>
          <p>{formatError(orgQuery.error)}</p>
        </article>
      )}

      {orgQuery.data && !facilityCode && (
        <article className="access-note error-block">
          <h2>Missing facility code</h2>
          <p>This facility does not have a facility code, so services cannot be loaded yet.</p>
        </article>
      )}

      {/* ── Add Service ── */}
      <Card>
        <CardContent className="pt-5">
          <h2 className="text-base font-bold text-slate-800 mb-4">Add Service</h2>
          <form onSubmit={handleAddService} className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
            <Input
              placeholder="Service name"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              disabled={addServiceMutation.isPending || !facilityCode}
            />
            <Select
              value={availability}
              onValueChange={(val) => setAvailability(val as Availability)}
              disabled={addServiceMutation.isPending || !facilityCode}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(AVAILABILITY_LABELS) as [Availability, string][]).map(
                  ([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
            <Input
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={addServiceMutation.isPending || !facilityCode}
              className="sm:col-span-1"
            />
            <Button type="submit" disabled={addServiceMutation.isPending || !facilityCode}>
              {addServiceMutation.isPending ? "Adding…" : "Add Service"}
            </Button>
          </form>
          {!facilityCode && !orgQuery.isLoading && (
            <p className="mt-2 text-sm text-amber-700">
              Facility code not available. Add or fix the facility code before managing services.
            </p>
          )}
          {addError && <p className="mt-2 text-sm font-medium text-red-600">{addError}</p>}
          {addSuccess && <p className="mt-2 text-sm font-medium text-emerald-700">Service added.</p>}
        </CardContent>
      </Card>

      {/* ── This facility's services ── */}
      <Card>
        <CardContent className="pt-5">
          <h2 className="text-base font-bold text-slate-800 mb-1">Our Services</h2>
          <p className="text-sm text-slate-500 mb-4">Services configured for this facility.</p>

          {orgQuery.isLoading && <p className="text-sm text-slate-500">Loading facility…</p>}
          {servicesQuery.isLoading && <p className="text-sm text-slate-500">Loading services…</p>}
          {servicesQuery.isError && (
            <p className="text-sm text-red-600">{formatError(servicesQuery.error)}</p>
          )}
          {!orgQuery.isLoading && !servicesQuery.isLoading && !servicesQuery.isError && facilityCode && (
            services.length === 0 ? (
              <p className="text-sm text-slate-500">No services added yet.</p>
            ) : (
              <DataTable
                data={serviceRows}
                columns={columns}
                emptyMessage="No services added yet."
                resultLabel="service"
              />
            )
          )}
        </CardContent>
      </Card>
    </section>
  );
}

export default FacilityServicesPage;
