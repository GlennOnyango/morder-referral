import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useEffect, useMemo, useState } from "react";
import type { SubmitEvent } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { getOrganizationById } from "../api/organizations";
import {
  createOrganizationService,
  listOrganizationServices,
  updateServiceById,
  type ServiceUpsertInput,
} from "../api/services";
import Breadcrumbs from "../components/Breadcrumbs";
import { useAuthContext } from "../context/AuthContext";
import type { MsOrganizationsInternalDomainModelService as Service } from "../types/api.generated";
import { canAccessOrganization, isFacilityManager } from "../utils/facilityAccess";

type ServiceFormState = {
  service_name: string;
  availability: "available" | "limited" | "unavailable";
  notes: string;
};

const defaultServiceFormState: ServiceFormState = {
  service_name: "",
  availability: "available",
  notes: "",
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

function serviceToFormState(service: Service): ServiceFormState {
  return {
    service_name: service.service_name ?? "",
    availability:
      service.availability === "limited" || service.availability === "unavailable"
        ? service.availability
        : "available",
    notes: service.notes ?? "",
  };
}

function toServicePayload(form: ServiceFormState): ServiceUpsertInput | null {
  const serviceName = form.service_name.trim();
  if (!serviceName) {
    return null;
  }

  return {
    service_name: serviceName,
    availability: form.availability,
    notes: form.notes.trim() || undefined,
  };
}

function OrganizationServiceFormPage() {
  const { id, serviceId } = useParams<{ id: string; serviceId?: string }>();
  const organizationId = id ?? "";
  const isEdit = Boolean(serviceId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session, isAuthenticated } = useAuthContext();
  const role = session?.role;
  const canManageOrganizations = isFacilityManager(role);

  const [formState, setFormState] = useState<ServiceFormState>(defaultServiceFormState);
  const [validationError, setValidationError] = useState<string | null>(null);

  const organizationQuery = useQuery({
    queryKey: ["organizations", "detail", organizationId, session?.accessToken],
    queryFn: () => getOrganizationById(organizationId, session?.accessToken),
    enabled: canManageOrganizations && organizationId.length > 0,
  });

  const servicesQuery = useQuery({
    queryKey: ["organizations", organizationId, "services", session?.accessToken],
    queryFn: () => listOrganizationServices(organizationId, session?.accessToken),
    enabled:
      isEdit &&
      canManageOrganizations &&
      organizationId.length > 0 &&
      canAccessOrganization(role, session?.facilityId, organizationQuery.data),
  });

  const selectedService = useMemo(
    () => servicesQuery.data?.find((service) => service.id === serviceId) ?? null,
    [serviceId, servicesQuery.data],
  );

  useEffect(() => {
    if (!isEdit || !selectedService) {
      return;
    }

    setFormState(serviceToFormState(selectedService));
  }, [isEdit, selectedService]);

  const navigateToServicesTable = () => {
    navigate(`/facilities/${organizationId}/services`, { replace: true });
  };

  const createMutation = useMutation({
    mutationFn: (payload: ServiceUpsertInput) =>
      createOrganizationService(organizationId, payload, session?.accessToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["organizations", organizationId, "services"],
      });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      navigateToServicesTable();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: ServiceUpsertInput) =>
      updateServiceById(serviceId!, payload, session?.accessToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["organizations", organizationId, "services"],
      });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      navigateToServicesTable();
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const submitError = createMutation.error ?? updateMutation.error;

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);

    const payload = toServicePayload(formState);
    if (!payload) {
      setValidationError("Service name is required.");
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

  if (!organizationId) {
    return <Navigate to="/facilities" replace />;
  }

  if (role === "HOSPITAL_ADMIN" && !session?.facilityId) {
    return <Navigate to="/dashboard" replace />;
  }

  if (organizationQuery.data && !canAccessOrganization(role, session?.facilityId, organizationQuery.data)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isEdit && servicesQuery.data && !selectedService) {
    return <Navigate to={`/facilities/${organizationId}/services`} replace />;
  }

  const facilityName =
    organizationQuery.data?.name ?? organizationQuery.data?.facility_code ?? "Facility";

  return (
    <section className="org-shell reveal delay-1">
      <div className="org-header">
        <div>
          <p className="eyebrow">Services</p>
          <h1>{isEdit ? "Edit Service" : "Create Service"}</h1>
          <p>
            {isEdit
              ? "Update this service and return to the services table."
              : "Add a new service and return to the services table."}
          </p>
        </div>
        <Link className="btn btn-ghost" to={`/facilities/${organizationId}/services`}>
          Back to Services
        </Link>
      </div>

      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: "Dashboard", to: "/dashboard" },
          { label: "Facilities", to: "/facilities" },
          { label: facilityName, to: `/facilities/${organizationId}` },
          { label: "Services", to: `/facilities/${organizationId}/services` },
          { label: isEdit ? "Edit" : "Create" },
        ]}
      />

      {organizationQuery.isError ? (
        <article className="access-note error-block">
          <h2>Could not load facility</h2>
          <p>{formatError(organizationQuery.error)}</p>
        </article>
      ) : null}

      {isEdit && servicesQuery.isLoading ? (
        <article className="access-note">
          <h2>Loading service</h2>
          <p>Fetching service details...</p>
        </article>
      ) : null}

      {isEdit && servicesQuery.isError ? (
        <article className="access-note error-block">
          <h2>Could not load service</h2>
          <p>{formatError(servicesQuery.error)}</p>
        </article>
      ) : null}

      {(!isEdit || selectedService) && !servicesQuery.isError ? (
        <article className="org-form-card">
          <form className="org-form" onSubmit={handleSubmit}>
            <div className="org-grid">
              <label className="field">
                <span>Service Name</span>
                <input
                  className="field-input"
                  value={formState.service_name}
                  onChange={(event) =>
                    setFormState((previous) => ({ ...previous, service_name: event.target.value }))
                  }
                  required
                />
              </label>

              <label className="field">
                <span>Availability</span>
                <select
                  className="field-input"
                  value={formState.availability}
                  onChange={(event) =>
                    setFormState((previous) => ({
                      ...previous,
                      availability: event.target.value as ServiceFormState["availability"],
                    }))
                  }
                >
                  <option value="available">Available</option>
                  <option value="limited">Limited</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </label>
            </div>

            <label className="field">
              <span>Notes</span>
              <textarea
                className="field-input service-notes"
                rows={3}
                value={formState.notes}
                onChange={(event) =>
                  setFormState((previous) => ({ ...previous, notes: event.target.value }))
                }
                placeholder="Additional information for this service..."
              />
            </label>

            <div className="service-form-actions">
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : isEdit ? "Save Service" : "Create Service"}
              </button>
              <Link className="btn btn-ghost" to={`/facilities/${organizationId}/services`}>
                Cancel
              </Link>
            </div>
          </form>
        </article>
      ) : null}

      {validationError ? <p className="result-note error-note">{validationError}</p> : null}
      {submitError ? <p className="result-note error-note">{formatError(submitError)}</p> : null}
    </section>
  );
}

export default OrganizationServiceFormPage;
