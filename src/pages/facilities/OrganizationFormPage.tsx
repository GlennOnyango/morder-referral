import { Button } from "../../components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useState } from "react";
import type { SubmitEvent } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  createOrganization,
  deleteOrganization,
  getOrganizationById,
  updateOrganization,
  type OrganizationCreateInput,
  type OrganizationUpdateInput,
} from "../../api/organizations";
import Breadcrumbs from "../../components/Breadcrumbs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { useAuthContext } from "../../context/useAuthContext";
import { canManageFacilityCatalog } from "../../utils/facilityAccess";

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
};

type WardOption = {
  name: string;
};

type SubcountyOption = {
  name: string;
  wards: WardOption[];
};

type CountyOption = {
  name: string;
  code: string;
  subcounties: SubcountyOption[];
};

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
};

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

function readOptionalString(source: unknown, keys: string[]): string {
  if (!source || typeof source !== "object") {
    return "";
  }

  const record = source as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return "";
}

function readOptionalBoolean(source: unknown, keys: string[]): boolean {
  if (!source || typeof source !== "object") {
    return false;
  }

  const record = source as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") {
      return value;
    }
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
  };
}

function mapFormToCreatePayload(form: OrganizationFormState): OrganizationCreateInput | null {
  const county = Number(form.county);
  const level = Number(form.level);
  const lat = Number(form.lat);
  const lng = Number(form.lng);
  const subCounty = form.subcounty.trim();
  const ward = form.ward.trim();

  if ([county, level, lat, lng].some((value) => Number.isNaN(value)) || !subCounty || !ward) {
    return null;
  }

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
  };
}

function mapFormToUpdatePayload(form: OrganizationFormState): OrganizationUpdateInput | null {
  const payload = mapFormToCreatePayload(form);
  if (!payload) {
    return null;
  }

  return payload;
}

function OrganizationFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session, isAuthenticated } = useAuthContext();
  const role = session?.role;
  const canManageOrganizations = canManageFacilityCatalog(role);

  const [formOverrides, setFormOverrides] = useState<OrganizationFormState | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const organizationQuery = useQuery({
    queryKey: ["organizations", "detail", id, session?.accessToken],
    queryFn: () => getOrganizationById(id!, session?.accessToken),
    enabled: isEdit && canManageOrganizations && Boolean(id),
  });

  const countyOptionsQuery = useQuery({
    queryKey: ["kenya-administrative-units"],
    queryFn: async (): Promise<CountyOption[]> => {
      const response = await fetch("/kenya-administrative-units.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Could not load county, sub-county, and ward data.");
      }

      return (await response.json()) as CountyOption[];
    },
    staleTime: Infinity,
  });

  const formState: OrganizationFormState =
    formOverrides ??
    (organizationQuery.data
      ? mapOrgToForm(organizationQuery.data as Record<string, unknown>)
      : defaultFormState);

  const setFormState = (
    updater: OrganizationFormState | ((prev: OrganizationFormState) => OrganizationFormState),
  ) => {
    setFormOverrides(typeof updater === "function" ? updater(formState) : updater);
  };

  const createMutation = useMutation({
    mutationFn: (payload: OrganizationCreateInput) =>
      createOrganization(payload, session?.accessToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      navigate("/facilities", { replace: true });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: OrganizationUpdateInput) =>
      updateOrganization(id!, payload, session?.accessToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      navigate("/facilities", { replace: true });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteOrganization(id!, session?.accessToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      navigate("/facilities", { replace: true });
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const submitError = createMutation.error ?? updateMutation.error;

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);

    const payload = isEdit
      ? mapFormToUpdatePayload(formState)
      : mapFormToCreatePayload(formState);
    if (!payload) {
      setValidationError(
        "County, sub-county, ward, level, latitude, and longitude are required and must be valid.",
      );
      return;
    }

    if (isEdit) {
      updateMutation.mutate(payload);
      return;
    }

    createMutation.mutate(payload);
  };

  const handleConfirmDelete = () => {
    if (!isEdit || !id || deleteMutation.isPending) {
      return;
    }

    deleteMutation.mutate();
  };

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  if (!canManageOrganizations) {
    return <Navigate to="/dashboard" replace />;
  }

  const facilityNameForEdit = organizationQuery.data?.name ?? "Facility";
  const countyOptions = countyOptionsQuery.data ?? [];
  const selectedCounty = countyOptions.find((county) => county.code === formState.county);
  const subcountyOptions = selectedCounty?.subcounties ?? [];
  const selectedSubcounty = subcountyOptions.find((subcounty) => subcounty.name === formState.subcounty);
  const wardOptions = selectedSubcounty?.wards ?? [];

  return (
    <section className="org-shell reveal delay-1">
      <div className="org-header">
        <div>
          <p className="eyebrow">Facilities</p>
          <h1>{isEdit ? "Update facility" : "Create facility"}</h1>
          <p>{isEdit ? "Edit facility details and save updates." : "Register a new facility."}</p>
        </div>
        <Link className="btn btn-ghost" to={isEdit && id ? `/facilities/${id}` : "/facilities"}>
          {isEdit ? "Back to Facility Workspace" : "Back to Facilities"}
        </Link>
      </div>

      <Breadcrumbs
        items={
          isEdit && id
            ? [
                { label: "Home", to: "/" },
                { label: "Dashboard", to: "/dashboard" },
                { label: "Facilities", to: "/facilities" },
                { label: facilityNameForEdit, to: `/facilities/${id}` },
                { label: "Edit" },
              ]
            : [
                { label: "Home", to: "/" },
                { label: "Dashboard", to: "/dashboard" },
                { label: "Facilities", to: "/facilities" },
                { label: "Create" },
              ]
        }
      />

      {isEdit && organizationQuery.isLoading ? (
        <article className="access-note">
          <h2>Loading facility</h2>
          <p>Fetching facility details...</p>
        </article>
      ) : null}

      {isEdit && organizationQuery.isError ? (
        <article className="access-note error-block">
          <h2>Could not load facility</h2>
          <p>{formatError(organizationQuery.error)}</p>
        </article>
      ) : null}

      {countyOptionsQuery.isError ? (
        <article className="access-note error-block">
          <h2>Could not load county data</h2>
          <p>{formatError(countyOptionsQuery.error)}</p>
        </article>
      ) : null}

      {(!isEdit || organizationQuery.data) && !organizationQuery.isError ? (
        <article className="org-form-card">
          <form className="org-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Facility Name</span>
              <input
                className="field-input"
                value={formState.name}
                onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </label>

            <label className="field">
              <span>Facility Code</span>
              <input
                className="field-input"
                value={formState.facility_code}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, facility_code: event.target.value }))
                }
                required
              />
            </label>

            <div className="org-grid">
              <label className="field">
                <span>County</span>
                <select
                  className="field-input"
                  value={formState.county}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      county: event.target.value,
                      subcounty: "",
                      ward: "",
                    }))
                  }
                  required
                >
                  <option value="">Select county</option>
                  {formState.county && !selectedCounty ? (
                    <option value={formState.county}>{`County Code ${formState.county}`}</option>
                  ) : null}
                  {countyOptions.map((county) => (
                    <option key={county.code} value={county.code}>
                      {county.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Level (1-6)</span>
                <input
                  className="field-input"
                  type="number"
                  min={1}
                  max={6}
                  value={formState.level}
                  onChange={(event) => setFormState((prev) => ({ ...prev, level: event.target.value }))}
                  required
                />
              </label>
            </div>

            <div className="org-grid">
              <label className="field">
                <span>Sub-county</span>
                <select
                  className="field-input"
                  value={formState.subcounty}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      subcounty: event.target.value,
                      ward: "",
                    }))
                  }
                  disabled={!formState.county}
                  required={subcountyOptions.length > 0}
                >
                  <option value="">Select sub-county</option>
                  {subcountyOptions.map((subcounty) => (
                    <option key={subcounty.name} value={subcounty.name}>
                      {subcounty.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Ward</span>
                <select
                  className="field-input"
                  value={formState.ward}
                  onChange={(event) => setFormState((prev) => ({ ...prev, ward: event.target.value }))}
                  disabled={!formState.subcounty}
                  required={wardOptions.length > 0}
                >
                  <option value="">Select ward</option>
                  {wardOptions.map((ward) => (
                    <option key={ward.name} value={ward.name}>
                      {ward.name}
                    </option>
                  ))}
                </select>
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
                  onChange={(event) => setFormState((prev) => ({ ...prev, lat: event.target.value }))}
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
                  onChange={(event) => setFormState((prev) => ({ ...prev, lng: event.target.value }))}
                  required
                />
              </label>
            </div>

            <label className="field">
              <span>Ownership Type</span>
              <select
                className="field-input"
                value={formState.ownership_type}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    ownership_type: event.target.value as OrganizationFormState["ownership_type"],
                  }))
                }
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="faith_based">Faith Based</option>
              </select>
            </label>

            <div className="field">
              <span>Transportation Available</span>
              <label className="field-checkbox" htmlFor="transport-available">
                <input
                  id="transport-available"
                  type="checkbox"
                  checked={formState.transport_available}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, transport_available: event.target.checked }))
                  }
                />
                <span>Transportation available</span>
              </label>
            </div>

            <div className="org-form-actions">
              <Button type="submit" className="btn btn-primary" disabled={isSubmitting || deleteMutation.isPending}>
                {isSubmitting
                  ? isEdit
                    ? "Saving..."
                    : "Creating..."
                  : isEdit
                    ? "Save Changes"
                    : "Create Facility"}
              </Button>

              {isEdit ? (
                <Button
                  type="button"
                  className="btn btn-outline"
                  disabled={isSubmitting || deleteMutation.isPending}
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  Delete Facility
                </Button>
              ) : null}
            </div>
          </form>
        </article>
      ) : null}

      {validationError ? <p className="result-note error-note">{validationError}</p> : null}

      {submitError ? <p className="result-note error-note">{formatError(submitError)}</p> : null}

      {deleteMutation.isError ? (
        <p className="result-note error-note">{formatError(deleteMutation.error)}</p>
      ) : null}

      <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => { if (!open) setIsDeleteDialogOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete facility?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you wish to delete{" "}
            <strong>{organizationQuery.data?.name ?? "this facility"}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleteMutation.isPending}
              onClick={() => setIsDeleteDialogOpen(false)}
            >
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

export default OrganizationFormPage;
