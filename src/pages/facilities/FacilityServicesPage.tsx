import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { listOrganizations, getOrganizationById } from "../../api/organizations";
import {
  createOrganizationService,
  deleteServiceById,
  listOrganizationServices,
} from "../../api/services";
import Breadcrumbs from "../../components/Breadcrumbs";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useAuthContext } from "../../context/useAuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import { isFacilityManager } from "../../utils/facilityAccess";
import type { MsOrganizationsInternalDomainModelOrganization as Organization } from "../../types/api.generated";

function formatError(error: unknown): string {
  if (isAxiosError(error)) {
    const payload = error.response?.data;
    if (payload && typeof payload === "object" && "message" in payload) {
      const v = (payload as { message?: unknown }).message;
      if (typeof v === "string") return v;
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Request failed. Please try again.";
}

type Availability = "available" | "limited" | "unavailable";

const AVAILABILITY_LABELS: Record<Availability, string> = {
  available: "Available",
  limited: "Limited",
  unavailable: "Unavailable",
};

function availabilityBadgeClass(a?: string) {
  if (a === "available") return "inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200";
  if (a === "limited") return "inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200";
  return "inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200";
}

function FacilityDetail({ org }: { org: Organization }) {
  const orgType = (org as Record<string, unknown>).organization_type as string | undefined;
  const county = (org as Record<string, unknown>).county;
  const subCounty = (org as Record<string, unknown>).sub_county as string | undefined;
  const ward = (org as Record<string, unknown>).ward as string | undefined;
  const ownershipType = (org as Record<string, unknown>).ownership_type as string | undefined;
  const transport = (org as Record<string, unknown>).transport_available as boolean | undefined;

  return (
    <div className="grid gap-2 text-sm text-slate-700">
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Facility Code</span>
          <p className="font-mono mt-0.5">{org.facility_code ?? "—"}</p>
        </div>
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Level</span>
          <p className="mt-0.5">{org.level ?? "—"}</p>
        </div>
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Type</span>
          <p className="mt-0.5 capitalize">{orgType ?? "facility"}</p>
        </div>
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ownership</span>
          <p className="mt-0.5">{ownershipType ?? "—"}</p>
        </div>
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">County</span>
          <p className="mt-0.5">{typeof county === "number" || typeof county === "string" ? county : "—"}</p>
        </div>
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Sub-county</span>
          <p className="mt-0.5">{subCounty ?? "—"}</p>
        </div>
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ward</span>
          <p className="mt-0.5">{ward ?? "—"}</p>
        </div>
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Transport</span>
          <p className="mt-0.5">{transport ? "Available" : "Not available"}</p>
        </div>
      </div>
    </div>
  );
}

function FacilityServicesPage() {
  const { workspaceId: organizationId } = useWorkspace();
  const { session, isAuthenticated } = useAuthContext();
  const queryClient = useQueryClient();
  const roles = session?.roles ?? [];
  const canManage = isFacilityManager(roles);

  const [serviceName, setServiceName] = useState("");
  const [availability, setAvailability] = useState<Availability>("available");
  const [notes, setNotes] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);

  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);

  const orgQuery = useQuery({
    queryKey: ["organizations", "detail", organizationId, session?.accessToken],
    queryFn: () => getOrganizationById(organizationId, session?.accessToken),
    enabled: canManage && organizationId.length > 0,
  });

  const servicesQuery = useQuery({
    queryKey: ["organizations", organizationId, "services", session?.accessToken],
    queryFn: () => listOrganizationServices(organizationId, session?.accessToken),
    enabled: canManage && organizationId.length > 0,
  });

  const facilitiesQuery = useQuery({
    queryKey: ["facilities-directory", session?.accessToken],
    queryFn: () => listOrganizations(session?.accessToken),
    enabled: canManage,
  });

  const addServiceMutation = useMutation({
    mutationFn: () =>
      createOrganizationService(
        organizationId,
        { service_name: serviceName.trim(), availability, notes: notes.trim() || undefined },
        session?.accessToken,
      ),
    onSuccess: async () => {
      setServiceName("");
      setNotes("");
      setAvailability("available");
      setAddError(null);
      setAddSuccess(true);
      setTimeout(() => setAddSuccess(false), 2000);
      await queryClient.invalidateQueries({
        queryKey: ["organizations", organizationId, "services"],
      });
    },
    onError: (err) => setAddError(formatError(err)),
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (serviceId: string) => deleteServiceById(serviceId, session?.accessToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["organizations", organizationId, "services"],
      });
    },
  });

  if (!isAuthenticated) return <Navigate to="/signin" replace />;
  if (!canManage) return <Navigate to={`/${organizationId}/dashboard`} replace />;

  const facilityName =
    orgQuery.data?.name ?? orgQuery.data?.facility_code ?? "Facility";

  const services = Array.isArray(servicesQuery.data) ? servicesQuery.data : [];
  const facilities = (Array.isArray(facilitiesQuery.data) ? facilitiesQuery.data : []).filter(
    (f) => f.id !== organizationId,
  );

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) {
      setAddError("Service name is required.");
      return;
    }
    setAddError(null);
    addServiceMutation.mutate();
  };

  const toggleFacility = (id: string) =>
    setSelectedFacilityId((prev) => (prev === id ? null : id));

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Facility Service
          </p>
          <h1 className="text-2xl font-bold text-slate-900">{facilityName}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage services offered by this facility and browse the facility directory.
          </p>
        </div>
      </div>

      <Breadcrumbs
        items={[
          { label: facilityName, to: `/${organizationId}/organization` },
          { label: "Facility Service" },
        ]}
      />

      {/* ── Add Service ── */}
      <Card>
        <CardContent className="pt-5">
          <h2 className="text-base font-bold text-slate-800 mb-4">Add Service</h2>
          <form onSubmit={handleAddService} className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
            <Input
              placeholder="Service name"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              disabled={addServiceMutation.isPending}
            />
            <Select
              value={availability}
              onValueChange={(val) => setAvailability(val as Availability)}
              disabled={addServiceMutation.isPending}
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
              disabled={addServiceMutation.isPending}
              className="sm:col-span-1"
            />
            <Button type="submit" disabled={addServiceMutation.isPending}>
              {addServiceMutation.isPending ? "Adding…" : "Add Service"}
            </Button>
          </form>
          {addError && <p className="mt-2 text-sm font-medium text-red-600">{addError}</p>}
          {addSuccess && <p className="mt-2 text-sm font-medium text-emerald-700">Service added.</p>}
        </CardContent>
      </Card>

      {/* ── This facility's services ── */}
      <Card>
        <CardContent className="pt-5">
          <h2 className="text-base font-bold text-slate-800 mb-1">Our Services</h2>
          <p className="text-sm text-slate-500 mb-4">Services configured for this facility.</p>

          {servicesQuery.isLoading && <p className="text-sm text-slate-500">Loading services…</p>}
          {servicesQuery.isError && (
            <p className="text-sm text-red-600">{formatError(servicesQuery.error)}</p>
          )}
          {!servicesQuery.isLoading && !servicesQuery.isError && (
            services.length === 0 ? (
              <p className="text-sm text-slate-500">No services added yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Availability</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services?.map((svc) => (
                    <TableRow key={svc.id ?? svc.service_name}>
                      <TableCell className="font-medium">{svc.service_name ?? "—"}</TableCell>
                      <TableCell>
                        <span className={availabilityBadgeClass(svc.availability)}>
                          {svc.availability ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-500">{svc.notes ?? "—"}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            if (svc.id && window.confirm(`Delete "${svc.service_name}"?`)) {
                              deleteServiceMutation.mutate(svc.id);
                            }
                          }}
                          disabled={deleteServiceMutation.isPending}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          )}
        </CardContent>
      </Card>

      {/* ── Facility directory ── */}
      <Card>
        <CardContent className="pt-5">
          <h2 className="text-base font-bold text-slate-800 mb-1">Facility Directory</h2>
          <p className="text-sm text-slate-500 mb-4">
            Click a facility to view its details.
          </p>

          {facilitiesQuery.isLoading && <p className="text-sm text-slate-500">Loading facilities…</p>}
          {facilitiesQuery.isError && (
            <p className="text-sm text-red-600">{formatError(facilitiesQuery.error)}</p>
          )}
          {!facilitiesQuery.isLoading && !facilitiesQuery.isError && (
            facilities.length === 0 ? (
              <p className="text-sm text-slate-500">No other facilities found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Ownership</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facilities.map((fac) => {
                    const facId = fac.id ?? "";
                    const isSelected = selectedFacilityId === facId;
                    return (
                      <>
                        <TableRow
                          key={facId}
                          className="cursor-pointer"
                          onClick={() => toggleFacility(facId)}
                        >
                          <TableCell className="font-medium text-slate-900">
                            <span className="flex items-center gap-2">
                              <span
                                className={`text-slate-400 transition-transform ${isSelected ? "rotate-90" : ""}`}
                                aria-hidden="true"
                              >
                                ▶
                              </span>
                              {fac.name ?? "Unnamed"}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-slate-600">{fac.facility_code ?? "—"}</TableCell>
                          <TableCell>{fac.level ?? "—"}</TableCell>
                          <TableCell>
                            {(fac as Record<string, unknown>).ownership_type as string ?? "—"}
                          </TableCell>
                        </TableRow>
                        {isSelected && (
                          <TableRow key={`${facId}-detail`} className="bg-slate-50 hover:bg-slate-50">
                            <TableCell colSpan={4} className="py-4 px-6">
                              <FacilityDetail org={fac} />
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            )
          )}
        </CardContent>
      </Card>
    </section>
  );
}

export default FacilityServicesPage;
