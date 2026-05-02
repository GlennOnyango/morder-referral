import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useOrganizationById } from "../../api/hooks/organizations/OrganizationById.hook";
import { useFacilityServices } from "../../api/hooks/services/FacilityServices.hook";
import { useCreateOrganizationService } from "../../api/hooks/services/CreateOrganizationService.hook";
import { useDeleteService } from "../../api/hooks/services/DeleteService.hook";
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

  const orgQuery = useOrganizationById(organizationId, session?.accessToken, {
    enabled: canManage && organizationId.length > 0,
  });

  const facilityCode = orgQuery.data?.facility_code;

  const servicesQuery = useFacilityServices(facilityCode, session?.accessToken, {
    enabled: canManage && Boolean(facilityCode),
  });

  const addServiceMutation = useCreateOrganizationService(session?.accessToken, {
    onSuccess: async () => {
      setServiceName("");
      setNotes("");
      setAvailability("available");
      setAddError(null);
      setAddSuccess(true);
      setTimeout(() => setAddSuccess(false), 2000);
      await queryClient.invalidateQueries({ queryKey: ["services", "facility", facilityCode] });
    },
    onError: (err) => setAddError(formatError(err)),
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

  const handleAddService = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!serviceName.trim()) {
      setAddError("Service name is required.");
      return;
    }
    setAddError(null);
    addServiceMutation.mutate({
      organizationId,
      payload: { service_name: serviceName.trim(), availability, notes: notes.trim() || undefined },
    });
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Facility Service
          </p>
          <h1 className="text-2xl font-bold text-slate-900">{facilityName}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage services offered by this facility.
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
    </section>
  );
}

export default FacilityServicesPage;
