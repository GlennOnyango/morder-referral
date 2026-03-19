import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useState } from "react";
import type { SubmitEvent } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { getOrganizationById } from "../api/organizations";
import {
  createOrganizationService,
  deleteServiceById,
  listOrganizationServices,
  updateServiceById,
  type ServiceUpsertInput,
} from "../api/services";
import { useAuthContext } from "../context/AuthContext";
import type { MsOrganizationsInternalDomainModelService as Service } from "../types/api.generated";

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

function OrganizationServicesPage() {
  const { id } = useParams<{ id: string }>();
  const organizationId = id ?? "";
  const { session, isAuthenticated } = useAuthContext();
  const role = session?.role ?? "unknown";
  const canManageOrganizations = role === "admin" || role === "super_admin";
  const queryClient = useQueryClient();

  const [formState, setFormState] = useState<ServiceFormState>(defaultServiceFormState);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const organizationQuery = useQuery({
    queryKey: ["organizations", "detail", organizationId, session?.accessToken],
    queryFn: () => getOrganizationById(organizationId, session?.accessToken),
    enabled: canManageOrganizations && organizationId.length > 0,
  });

  const servicesQuery = useQuery({
    queryKey: ["organizations", organizationId, "services", session?.accessToken],
    queryFn: () => listOrganizationServices(organizationId, session?.accessToken),
    enabled: canManageOrganizations && organizationId.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: (payload: ServiceUpsertInput) =>
      createOrganizationService(organizationId, payload, session?.accessToken),
    onSuccess: async () => {
      setFormState(defaultServiceFormState);
      await queryClient.invalidateQueries({
        queryKey: ["organizations", organizationId, "services"],
      });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ serviceId, payload }: { serviceId: string; payload: ServiceUpsertInput }) =>
      updateServiceById(serviceId, payload, session?.accessToken),
    onSuccess: async () => {
      setEditingServiceId(null);
      setFormState(defaultServiceFormState);
      await queryClient.invalidateQueries({
        queryKey: ["organizations", organizationId, "services"],
      });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    },
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

    if (editingServiceId) {
      updateMutation.mutate({ serviceId: editingServiceId, payload });
      return;
    }

    createMutation.mutate(payload);
  };

  const handleEdit = (service: Service) => {
    if (!service.id) {
      return;
    }
    setEditingServiceId(service.id);
    setFormState(serviceToFormState(service));
    setValidationError(null);
  };

  const handleCancelEdit = () => {
    setEditingServiceId(null);
    setFormState(defaultServiceFormState);
    setValidationError(null);
  };

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
    return <Navigate to="/organizations" replace />;
  }

  return (
    <section className="org-shell reveal delay-1">
      <div className="org-header">
        <div>
          <p className="eyebrow">Services</p>
          <h1>
            Manage Services:{" "}
            {organizationQuery.data?.name ?? (organizationQuery.isLoading ? "Loading..." : "Organization")}
          </h1>
          <p>Create, update, and delete service records for this organization.</p>
        </div>
        <Link className="btn btn-ghost" to="/organizations">
          Back to Organizations
        </Link>
      </div>

      {organizationQuery.isError ? (
        <article className="access-note error-block">
          <h2>Could not load organization</h2>
          <p>{formatError(organizationQuery.error)}</p>
        </article>
      ) : null}

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
              onChange={(event) => setFormState((previous) => ({ ...previous, notes: event.target.value }))}
              placeholder="Additional information for this service..."
            />
          </label>

          <div className="service-form-actions">
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting
                ? editingServiceId
                  ? "Saving..."
                  : "Adding..."
                : editingServiceId
                  ? "Save Service"
                  : "Add Service"}
            </button>
            {editingServiceId ? (
              <button type="button" className="btn btn-ghost" onClick={handleCancelEdit}>
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>
      </article>

      {validationError ? <p className="result-note error-note">{validationError}</p> : null}

      {submitError ? <p className="result-note error-note">{formatError(submitError)}</p> : null}

      {servicesQuery.isLoading ? (
        <article className="access-note">
          <h2>Loading services</h2>
          <p>Fetching organization services...</p>
        </article>
      ) : null}

      {servicesQuery.isError ? (
        <article className="access-note error-block">
          <h2>Could not load services</h2>
          <p>{formatError(servicesQuery.error)}</p>
        </article>
      ) : null}

      {servicesQuery.data ? (
        <article className="org-table-card">
          {servicesQuery.data.length === 0 ? (
            <p className="org-empty">No services found for this organization.</p>
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
                  {servicesQuery.data.map((service) => {
                    const serviceId = service.id ?? "";
                    const serviceName = service.service_name ?? "Unnamed service";

                    return (
                      <tr key={serviceId || serviceName}>
                        <td>{serviceName}</td>
                        <td>{service.availability ?? "-"}</td>
                        <td>{service.notes ?? "-"}</td>
                        <td>
                          <div className="org-actions">
                            <button
                              type="button"
                              className="btn btn-ghost org-btn"
                              disabled={!serviceId}
                              onClick={() => handleEdit(service)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline org-btn"
                              disabled={!serviceId || deleteMutation.isPending}
                              onClick={() => handleDelete(serviceId, serviceName)}
                            >
                              Delete
                            </button>
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
