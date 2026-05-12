import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { formatError } from "../../utils/format";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useAuthContext } from "../../context/useAuthContext";
import {
  type OrganizationCreateInput,
  type OrganizationUpdateInput,
} from "../../api/organizations";
import { useGetOrganizationById } from "../../api/hooks/organizations/OrganizationById.hook";
import { usePostOrganization } from "../../api/hooks/organizations/CreateOrganization.hook";
import { usePutOrganization } from "../../api/hooks/organizations/UpdateOrganization.hook";
import { useDeleteOrganization } from "../../api/hooks/organizations/DeleteOrganization.hook";
import Breadcrumbs from "../../components/Breadcrumbs";

type OrganizationFormState = {
  name: string;
  facility_code: string;
  county: string;
  subcounty: string;
  ward: string;
  transport_available: boolean;
  level: string;
  lat: string;
  lng: string;
  ownership_type: "public" | "private" | "faith_based";
  organization_type: "facility" | "service";
};

type WardOption = { name: string };
type SubcountyOption = { name: string; wards: WardOption[] };
type CountyOption = { name: string; code: string; subcounties: SubcountyOption[] };

const defaultFormState: OrganizationFormState = {
  name: "",
  facility_code: "",
  county: "",
  subcounty: "",
  ward: "",
  transport_available: false,
  level: "",
  lat: "",
  lng: "",
  ownership_type: "public",
  organization_type: "facility",
};

function readOptionalString(source: unknown, keys: string[]): string {
  if (!source || typeof source !== "object") return "";
  const record = source as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return "";
}

function readOptionalBoolean(source: unknown, keys: string[]): boolean {
  if (!source || typeof source !== "object") return false;
  const record = source as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
  }
  return false;
}

function mapOrgToForm(org: Record<string, unknown>): OrganizationFormState {
  return {
    name: typeof org.name === "string" ? org.name : "",
    facility_code: typeof org.facility_code === "string" ? org.facility_code : "",
    county: typeof org.county === "number" ? org.county.toString().padStart(3, "0") : "",
    subcounty: readOptionalString(org, ["sub_county", "subCounty"]),
    ward: readOptionalString(org, ["ward"]),
    transport_available: readOptionalBoolean(org, ["transport_available", "transportAvailable"]),
    level: typeof org.level === "number" ? org.level.toString() : "",
    lat: typeof org.lat === "number" ? org.lat.toString() : "",
    lng: typeof org.lng === "number" ? org.lng.toString() : "",
    ownership_type:
      org.ownership_type === "private" || org.ownership_type === "faith_based"
        ? org.ownership_type
        : "public",
    organization_type: org.organization_type === "service" ? "service" : "facility",
  };
}

function mapFormToPayload(form: OrganizationFormState): OrganizationCreateInput | null {
  const county = Number(form.county);
  const level = Number(form.level);
  const lat = Number(form.lat);
  const lng = Number(form.lng);
  const subCounty = form.subcounty.trim();
  const ward = form.ward.trim();

  if ([county, level, lat, lng].some((v) => Number.isNaN(v)) || !subCounty || !ward) return null;

  return {
    name: form.name.trim(),
    facility_code: form.facility_code.trim(),
    county,
    sub_county: subCounty,
    ward,
    transport_available: form.transport_available,
    level,
    lat,
    lng,
    ownership_type: form.ownership_type,
    organization_type: form.organization_type,
  };
}

function FacilityFormPage() {
  const { workspaceId: organizationId } = useWorkspace();
  const { session, activeWorkspace, activeWorkspaceId } = useAuthContext();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isEdit = pathname.endsWith("/organization/edit");

  // Use activeWorkspace if it matches the org being edited — avoids a redundant fetch during impersonation.
  const workspaceMatchesOrg =
    isEdit &&
    activeWorkspace != null &&
    (String(activeWorkspace.id) === organizationId ||
      activeWorkspace.facility_code === organizationId);

  const organizationQuery = useGetOrganizationById(organizationId, session?.accessToken, {
    enabled: isEdit && !workspaceMatchesOrg && Boolean(organizationId),
  });

  const orgData = workspaceMatchesOrg
    ? (activeWorkspace as unknown as Record<string, unknown>)
    : (organizationQuery.data as Record<string, unknown> | undefined);

  const countyOptionsQuery = useQuery({
    queryKey: ["kenya-administrative-units"],
    queryFn: async (): Promise<CountyOption[]> => {
      const response = await fetch("/kenya-administrative-units.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load county, sub-county, and ward data.");
      return (await response.json()) as CountyOption[];
    },
    staleTime: Infinity,
  });

  const [formOverrides, setFormOverrides] = useState<OrganizationFormState | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const formState: OrganizationFormState = formOverrides ?? (orgData ? mapOrgToForm(orgData) : defaultFormState);

  const setFormState = (updater: OrganizationFormState | ((prev: OrganizationFormState) => OrganizationFormState)) => {
    setFormOverrides(typeof updater === "function" ? updater(formState) : updater);
  };

  const listPath = `/${activeWorkspaceId}/organizations`;

  const createMutation = usePostOrganization(session?.accessToken, {
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      await queryClient.invalidateQueries({ queryKey: ["metrics", "dashboard"] });
      navigate(listPath, { replace: true });
    },
  });

  const updateMutation = usePutOrganization(session?.accessToken, {
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      await queryClient.invalidateQueries({ queryKey: ["metrics", "dashboard"] });
      navigate(`/${organizationId}/organization`, { replace: true });
    },
  });

  const deleteMutation = useDeleteOrganization(session?.accessToken, {
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      await queryClient.invalidateQueries({ queryKey: ["metrics", "dashboard"] });
      navigate(listPath, { replace: true });
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const submitError = createMutation.error ?? updateMutation.error;

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setValidationError(null);
    const payload = mapFormToPayload(formState);
    if (!payload) {
      setValidationError("County, sub-county, ward, level, latitude, and longitude are required.");
      return;
    }
    if (isEdit) {
      updateMutation.mutate({ id: organizationId, payload: payload as OrganizationUpdateInput });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleConfirmDelete = () => {
    if (!isEdit || !organizationId || deleteMutation.isPending) return;
    deleteMutation.mutate(organizationId);
  };

  const facilityName = orgData
    ? String((orgData as Record<string, unknown>).name ?? "Facility")
    : "Facility";

  const countyOptions = countyOptionsQuery.data ?? [];
  const selectedCounty = countyOptions.find((c) => c.code === formState.county);
  const subcountyOptions = selectedCounty?.subcounties ?? [];
  const selectedSubcounty = subcountyOptions.find((s) => s.name === formState.subcounty);
  const wardOptions = selectedSubcounty?.wards ?? [];

  const isLoading = isEdit && !workspaceMatchesOrg && organizationQuery.isLoading;
  const isError = isEdit && !workspaceMatchesOrg && organizationQuery.isError;

  return (
    <section className="org-shell reveal delay-1">
      <Card>
        <CardContent className="flex items-end justify-between gap-3 px-5 py-4">
          <div className="flex flex-col gap-1">
            <p className="eyebrow">Facilities</p>
            <h1 className="font-heading text-2xl font-semibold -tracking-[0.03em] text-slate-900 sm:text-3xl">
              {isEdit ? "Update facility" : "Create facility"}
            </h1>
            <p className="text-sm text-slate-500">
              {isEdit ? "Edit facility details and save updates." : "Register a new facility."}
            </p>
          </div>
          <Link
            className="btn btn-ghost"
            to={isEdit ? `/${organizationId}/organization` : listPath}
          >
            {isEdit ? "Back to Facility Workspace" : "Back to Facilities"}
          </Link>
        </CardContent>
      </Card>

      <Breadcrumbs
        items={
          isEdit
            ? [
                { label: facilityName, to: `/${organizationId}/organization` },
                { label: "Edit" },
              ]
            : [
                { label: "Organizations", to: listPath },
                { label: "Create" },
              ]
        }
      />

      {isLoading && (
        <article className="access-note">
          <h2>Loading facility</h2>
          <p>Fetching facility details...</p>
        </article>
      )}

      {isError && (
        <article className="access-note error-block">
          <h2>Could not load facility</h2>
          <p>{formatError(organizationQuery.error)}</p>
        </article>
      )}

      {countyOptionsQuery.isError && (
        <article className="access-note error-block">
          <h2>Could not load county data</h2>
          <p>{formatError(countyOptionsQuery.error)}</p>
        </article>
      )}

      {(!isEdit || orgData) && !isError && (
        <article className="org-form-card">
          <form className="org-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Facility Name</span>
              <input
                className="field-input"
                value={formState.name}
                onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </label>

            <label className="field">
              <span>Facility Code</span>
              <input
                className="field-input"
                value={formState.facility_code}
                onChange={(e) => setFormState((prev) => ({ ...prev, facility_code: e.target.value }))}
                required
              />
            </label>

            <div className="org-grid">
              <label className="field">
                <span>County</span>
                <Select
                  value={formState.county || undefined}
                  onValueChange={(v) => setFormState((prev) => ({ ...prev, county: v, subcounty: "", ward: "" }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select county" /></SelectTrigger>
                  <SelectContent>
                    {formState.county && !selectedCounty && (
                      <SelectItem value={formState.county}>{`County Code ${formState.county}`}</SelectItem>
                    )}
                    {countyOptions.map((county) => (
                      <SelectItem key={county.code} value={county.code}>{county.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label className="field">
                <span>Level (1-6)</span>
                <input
                  className="field-input"
                  type="number"
                  min={1}
                  max={6}
                  value={formState.level}
                  onChange={(e) => setFormState((prev) => ({ ...prev, level: e.target.value }))}
                  required
                />
              </label>
            </div>

            <div className="org-grid">
              <label className="field">
                <span>Sub-county</span>
                <Select
                  value={formState.subcounty || undefined}
                  onValueChange={(v) => setFormState((prev) => ({ ...prev, subcounty: v, ward: "" }))}
                  disabled={!formState.county}
                >
                  <SelectTrigger><SelectValue placeholder="Select sub-county" /></SelectTrigger>
                  <SelectContent>
                    {subcountyOptions.map((s) => (
                      <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label className="field">
                <span>Ward</span>
                <Select
                  value={formState.ward || undefined}
                  onValueChange={(v) => setFormState((prev) => ({ ...prev, ward: v }))}
                  disabled={!formState.subcounty}
                >
                  <SelectTrigger><SelectValue placeholder="Select ward" /></SelectTrigger>
                  <SelectContent>
                    {wardOptions.map((w) => (
                      <SelectItem key={w.name} value={w.name}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>

            <div className="org-grid">
              <label className="field">
                <span>Latitude</span>
                <input
                  className="field-input"
                  type="number"
                  step="any"
                  value={formState.lat}
                  onChange={(e) => setFormState((prev) => ({ ...prev, lat: e.target.value }))}
                  required
                />
              </label>

              <label className="field">
                <span>Longitude</span>
                <input
                  className="field-input"
                  type="number"
                  step="any"
                  value={formState.lng}
                  onChange={(e) => setFormState((prev) => ({ ...prev, lng: e.target.value }))}
                  required
                />
              </label>
            </div>

            <label className="field">
              <span>Organization Type</span>
              <Select
                value={formState.organization_type}
                onValueChange={(v) => setFormState((prev) => ({ ...prev, organization_type: v as OrganizationFormState["organization_type"] }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="facility">Facility</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <label className="field">
              <span>Ownership Type</span>
              <Select
                value={formState.ownership_type}
                onValueChange={(v) => setFormState((prev) => ({ ...prev, ownership_type: v as OrganizationFormState["ownership_type"] }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="faith_based">Faith Based</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <div className="field">
              <span>Transportation Available</span>
              <label className="field-checkbox" htmlFor="transport-available">
                <input
                  id="transport-available"
                  type="checkbox"
                  checked={formState.transport_available}
                  onChange={(e) => setFormState((prev) => ({ ...prev, transport_available: e.target.checked }))}
                />
                <span>Transportation available</span>
              </label>
            </div>

            <div className="org-form-actions">
              <Button type="submit" className="btn btn-primary" disabled={isSubmitting || deleteMutation.isPending}>
                {isSubmitting ? (isEdit ? "Saving..." : "Creating...") : isEdit ? "Save Changes" : "Create Facility"}
              </Button>
              {isEdit && (
                <Button
                  type="button"
                  className="btn btn-outline"
                  disabled={isSubmitting || deleteMutation.isPending}
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  Delete Facility
                </Button>
              )}
            </div>
          </form>
        </article>
      )}

      {validationError && <p className="result-note error-note">{validationError}</p>}
      {submitError && <p className="result-note error-note">{formatError(submitError)}</p>}
      {deleteMutation.isError && <p className="result-note error-note">{formatError(deleteMutation.error)}</p>}

      <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => { if (!open) setIsDeleteDialogOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete facility?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you wish to delete <strong>{facilityName}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={deleteMutation.isPending} onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
              disabled={deleteMutation.isPending}
              onClick={handleConfirmDelete}
            >
              {deleteMutation.isPending ? "Deleting..." : "Yes, Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default FacilityFormPage;
