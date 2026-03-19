import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useEffect, useState } from "react";
import type { SubmitEvent } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  createOrganization,
  getOrganizationById,
  updateOrganization,
  type OrganizationUpsertInput,
} from "../api/organizations";
import { useAuthContext } from "../context/AuthContext";

type OrganizationFormState = {
  name: string;
  facility_code: string;
  county: string;
  level: string;
  lat: string;
  lng: string;
  ownership_type: "public" | "private" | "faith_based";
};

const defaultFormState: OrganizationFormState = {
  name: "",
  facility_code: "",
  county: "",
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

function mapFormToPayload(form: OrganizationFormState): OrganizationUpsertInput | null {
  const county = Number(form.county);
  const level = Number(form.level);
  const lat = Number(form.lat);
  const lng = Number(form.lng);

  if ([county, level, lat, lng].some((value) => Number.isNaN(value))) {
    return null;
  }

  return {
    name: form.name.trim(),
    facility_code: form.facility_code.trim(),
    county,
    level,
    lat,
    lng,
    ownership_type: form.ownership_type,
  };
}

function OrganizationFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session, isAuthenticated } = useAuthContext();
  const role = session?.role ?? "unknown";
  const canManageOrganizations = role === "admin" || role === "super_admin";

  const [formState, setFormState] = useState<OrganizationFormState>(defaultFormState);
  const [validationError, setValidationError] = useState<string | null>(null);

  const organizationQuery = useQuery({
    queryKey: ["organizations", "detail", id, session?.accessToken],
    queryFn: () => getOrganizationById(id!, session?.accessToken),
    enabled: isEdit && canManageOrganizations && Boolean(id),
  });

  useEffect(() => {
    if (!organizationQuery.data) {
      return;
    }

    setFormState({
      name: organizationQuery.data.name ?? "",
      facility_code: organizationQuery.data.facility_code ?? "",
      county: organizationQuery.data.county?.toString() ?? "",
      level: organizationQuery.data.level?.toString() ?? "",
      lat: organizationQuery.data.lat?.toString() ?? "",
      lng: organizationQuery.data.lng?.toString() ?? "",
      ownership_type:
        organizationQuery.data.ownership_type === "private" ||
        organizationQuery.data.ownership_type === "faith_based"
          ? organizationQuery.data.ownership_type
          : "public",
    });
  }, [organizationQuery.data]);

  const createMutation = useMutation({
    mutationFn: (payload: OrganizationUpsertInput) => createOrganization(payload, session?.accessToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      navigate("/organizations", { replace: true });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: OrganizationUpsertInput) =>
      updateOrganization(id!, payload, session?.accessToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      navigate("/organizations", { replace: true });
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const submitError = createMutation.error ?? updateMutation.error;

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);

    const payload = mapFormToPayload(formState);
    if (!payload) {
      setValidationError("County, level, latitude, and longitude must be valid numbers.");
      return;
    }

    if (isEdit) {
      updateMutation.mutate(payload);
      return;
    }

    createMutation.mutate(payload);
  };

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  if (!canManageOrganizations) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <section className="org-shell reveal delay-1">
      <div className="org-header">
        <div>
          <p className="eyebrow">Organizations</p>
          <h1>{isEdit ? "Update organization" : "Create organization"}</h1>
          <p>{isEdit ? "Edit organization details and save updates." : "Register a new organization."}</p>
        </div>
        <Link className="btn btn-ghost" to="/organizations">
          Back to Organizations
        </Link>
      </div>

      {isEdit && organizationQuery.isLoading ? (
        <article className="access-note">
          <h2>Loading organization</h2>
          <p>Fetching organization details...</p>
        </article>
      ) : null}

      {isEdit && organizationQuery.isError ? (
        <article className="access-note error-block">
          <h2>Could not load organization</h2>
          <p>{formatError(organizationQuery.error)}</p>
        </article>
      ) : null}

      {(!isEdit || organizationQuery.data) && !organizationQuery.isError ? (
        <article className="org-form-card">
          <form className="org-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Organization Name</span>
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
                <span>County (1-47)</span>
                <input
                  className="field-input"
                  type="number"
                  min={1}
                  max={47}
                  value={formState.county}
                  onChange={(event) => setFormState((prev) => ({ ...prev, county: event.target.value }))}
                  required
                />
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

            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting
                ? isEdit
                  ? "Saving..."
                  : "Creating..."
                : isEdit
                  ? "Save Changes"
                  : "Create Organization"}
            </button>
          </form>
        </article>
      ) : null}

      {validationError ? <p className="result-note error-note">{validationError}</p> : null}

      {submitError ? <p className="result-note error-note">{formatError(submitError)}</p> : null}
    </section>
  );
}

export default OrganizationFormPage;
