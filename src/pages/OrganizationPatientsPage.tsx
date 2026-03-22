import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useState } from "react";
import type { SubmitEvent } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { getOrganizationById } from "../api/organizations";
import {
  createPatient,
  deletePatientById,
  listPatients,
  updatePatientById,
  type PatientListQuery,
  type PatientUpsertInput,
} from "../api/patients";
import { useAuthContext } from "../context/AuthContext";
import type { MsOrganizationsInternalDomainModelPatient as Patient } from "../types/api.generated";
import { canAccessOrganization, isFacilityManager } from "../utils/facilityAccess";

type PatientFormState = {
  full_name: string;
  date_of_birth: string;
  gender: "male" | "female" | "other" | "unknown";
  primary_phone: string;
  active: boolean;
  city: string;
  postal_code: string;
  status: string;
};

const defaultPatientFormState: PatientFormState = {
  full_name: "",
  date_of_birth: "",
  gender: "unknown",
  primary_phone: "",
  active: true,
  city: "",
  postal_code: "",
  status: "",
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

function patientToFormState(patient: Patient): PatientFormState {
  return {
    full_name: patient.full_name ?? "",
    date_of_birth: patient.date_of_birth ?? "",
    gender:
      patient.gender === "male" ||
      patient.gender === "female" ||
      patient.gender === "other" ||
      patient.gender === "unknown"
        ? patient.gender
        : "unknown",
    primary_phone: patient.primary_phone ?? "",
    active: patient.active ?? true,
    city: patient.address?.city ?? "",
    postal_code: patient.address?.postal_code ?? "",
    status: patient.address?.status ?? "",
  };
}

function toPatientPayload(formState: PatientFormState): PatientUpsertInput | null {
  const fullName = formState.full_name.trim();
  const dateOfBirth = formState.date_of_birth.trim();
  const primaryPhone = formState.primary_phone.trim();

  if (!fullName || !dateOfBirth || !primaryPhone) {
    return null;
  }

  return {
    full_name: fullName,
    date_of_birth: dateOfBirth,
    primary_phone: primaryPhone,
    gender: formState.gender,
    active: formState.active,
    address: {
      city: formState.city.trim() || undefined,
      postal_code: formState.postal_code.trim() || undefined,
      status: formState.status.trim() || undefined,
    },
  };
}

function summarizeAddress(patient: Patient): string {
  const city = patient.address?.city?.trim() ?? "";
  const postalCode = patient.address?.postal_code?.trim() ?? "";
  const status = patient.address?.status?.trim() ?? "";
  const parts = [city, postalCode, status].filter((value) => value.length > 0);

  if (parts.length === 0) {
    return "-";
  }

  return parts.join(", ");
}

function OrganizationPatientsPage() {
  const { id } = useParams<{ id: string }>();
  const organizationId = id ?? "";
  const { session, isAuthenticated } = useAuthContext();
  const role = session?.role;
  const canManageOrganizations = isFacilityManager(role);
  const queryClient = useQueryClient();

  const [patientFormState, setPatientFormState] = useState<PatientFormState>(defaultPatientFormState);
  const [patientValidationError, setPatientValidationError] = useState<string | null>(null);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [searchNameInput, setSearchNameInput] = useState("");
  const [searchDobInput, setSearchDobInput] = useState("");
  const [patientQuery, setPatientQuery] = useState<PatientListQuery>({});
  const [deletingPatient, setDeletingPatient] = useState<{ id: string; name: string } | null>(null);

  const organizationQuery = useQuery({
    queryKey: ["organizations", "detail", organizationId, session?.accessToken],
    queryFn: () => getOrganizationById(organizationId, session?.accessToken),
    enabled: canManageOrganizations && organizationId.length > 0,
  });

  const patientsQuery = useQuery({
    queryKey: [
      "patients",
      organizationId,
      patientQuery.name ?? "",
      patientQuery.dob ?? "",
      session?.accessToken,
    ],
    queryFn: () => listPatients(patientQuery, session?.accessToken),
    enabled:
      canManageOrganizations &&
      organizationId.length > 0 &&
      canAccessOrganization(role, session?.facilityId, organizationQuery.data),
  });

  const createPatientMutation = useMutation({
    mutationFn: (payload: PatientUpsertInput) => createPatient(payload, session?.accessToken),
    onSuccess: async () => {
      setPatientFormState(defaultPatientFormState);
      await queryClient.invalidateQueries({ queryKey: ["patients"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    },
  });

  const updatePatientMutation = useMutation({
    mutationFn: ({ patientId, payload }: { patientId: string; payload: PatientUpsertInput }) =>
      updatePatientById(patientId, payload, session?.accessToken),
    onSuccess: async () => {
      setEditingPatientId(null);
      setPatientFormState(defaultPatientFormState);
      await queryClient.invalidateQueries({ queryKey: ["patients"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    },
  });

  const deletePatientMutation = useMutation({
    mutationFn: (patientId: string) => deletePatientById(patientId, session?.accessToken),
    onSuccess: async () => {
      setDeletingPatient(null);
      await queryClient.invalidateQueries({ queryKey: ["patients"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    },
  });

  const isSubmittingPatient = createPatientMutation.isPending || updatePatientMutation.isPending;
  const patientSubmitError = createPatientMutation.error ?? updatePatientMutation.error;

  const handlePatientSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPatientValidationError(null);

    const payload = toPatientPayload(patientFormState);
    if (!payload) {
      setPatientValidationError("Full name, date of birth, and primary phone are required.");
      return;
    }

    if (editingPatientId) {
      updatePatientMutation.mutate({ patientId: editingPatientId, payload });
      return;
    }

    createPatientMutation.mutate(payload);
  };

  const handleEditPatient = (patient: Patient) => {
    if (!patient.id) {
      return;
    }

    setEditingPatientId(patient.id);
    setPatientFormState(patientToFormState(patient));
    setPatientValidationError(null);
  };

  const handleCancelPatientEdit = () => {
    setEditingPatientId(null);
    setPatientFormState(defaultPatientFormState);
    setPatientValidationError(null);
  };

  const handleApplyPatientFilters = () => {
    const name = searchNameInput.trim();
    const dob = searchDobInput.trim();
    setPatientQuery({
      name: name || undefined,
      dob: dob || undefined,
    });
  };

  const handleClearPatientFilters = () => {
    setSearchNameInput("");
    setSearchDobInput("");
    setPatientQuery({});
  };

  const handleConfirmDeletePatient = () => {
    if (!deletingPatient || deletePatientMutation.isPending) {
      return;
    }
    deletePatientMutation.mutate(deletingPatient.id);
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

  return (
    <section className="org-shell reveal delay-1">
      <div className="org-header">
        <div>
          <p className="eyebrow">Patients</p>
          <h1>
            Patient workflow:{" "}
            {organizationQuery.data?.name ?? (organizationQuery.isLoading ? "Loading facility..." : "Facility")}
          </h1>
          <p>Search, create, update, and delete patient records.</p>
        </div>
        <div className="org-actions">
          <Link className="btn btn-ghost org-btn" to={`/facilities/${organizationId}`}>
            Workspace
          </Link>
          <Link className="btn btn-ghost org-btn" to={`/facilities/${organizationId}/services`}>
            Services
          </Link>
          <Link className="btn btn-ghost org-btn" to={`/facilities/${organizationId}/users`}>
            Users
          </Link>
          <Link className="btn btn-ghost org-btn" to={`/facilities/${organizationId}/referrals`}>
            Referrals
          </Link>
          <Link className="btn btn-ghost org-btn" to="/facilities">
            Back to Facilities
          </Link>
        </div>
      </div>

      {organizationQuery.isError ? (
        <article className="access-note error-block">
          <h2>Could not load facility</h2>
          <p>{formatError(organizationQuery.error)}</p>
        </article>
      ) : null}

      <article className="org-form-card">
        <h2>Patient workflow</h2>
        <p className="org-section-note">Manage patient records from this dedicated page.</p>

        <div className="patient-search-grid">
          <label className="field">
            <span>Search by name</span>
            <input
              className="field-input"
              value={searchNameInput}
              onChange={(event) => setSearchNameInput(event.target.value)}
              placeholder="e.g. Jane Doe"
            />
          </label>
          <label className="field">
            <span>Date of birth</span>
            <input
              className="field-input"
              type="date"
              value={searchDobInput}
              onChange={(event) => setSearchDobInput(event.target.value)}
            />
          </label>
        </div>

        <div className="service-form-actions">
          <button type="button" className="btn btn-ghost" onClick={handleApplyPatientFilters}>
            Search
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleClearPatientFilters}>
            Clear
          </button>
        </div>

        <form className="org-form patient-form-wrap" onSubmit={handlePatientSubmit}>
          <div className="patient-form-grid">
            <label className="field">
              <span>Full name</span>
              <input
                className="field-input"
                value={patientFormState.full_name}
                onChange={(event) =>
                  setPatientFormState((previous) => ({ ...previous, full_name: event.target.value }))
                }
                required
              />
            </label>
            <label className="field">
              <span>Date of birth</span>
              <input
                className="field-input"
                type="date"
                value={patientFormState.date_of_birth}
                onChange={(event) =>
                  setPatientFormState((previous) => ({ ...previous, date_of_birth: event.target.value }))
                }
                required
              />
            </label>
          </div>

          <div className="patient-form-grid">
            <label className="field">
              <span>Gender</span>
              <select
                className="field-input"
                value={patientFormState.gender}
                onChange={(event) =>
                  setPatientFormState((previous) => ({
                    ...previous,
                    gender: event.target.value as PatientFormState["gender"],
                  }))
                }
              >
                <option value="unknown">Unknown</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="field">
              <span>Primary phone</span>
              <input
                className="field-input"
                value={patientFormState.primary_phone}
                onChange={(event) =>
                  setPatientFormState((previous) => ({ ...previous, primary_phone: event.target.value }))
                }
                required
              />
            </label>
          </div>

          <div className="patient-address-grid">
            <label className="field">
              <span>City</span>
              <input
                className="field-input"
                value={patientFormState.city}
                onChange={(event) =>
                  setPatientFormState((previous) => ({ ...previous, city: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Postal code</span>
              <input
                className="field-input"
                value={patientFormState.postal_code}
                onChange={(event) =>
                  setPatientFormState((previous) => ({ ...previous, postal_code: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Status</span>
              <input
                className="field-input"
                value={patientFormState.status}
                onChange={(event) =>
                  setPatientFormState((previous) => ({ ...previous, status: event.target.value }))
                }
              />
            </label>
          </div>

          <label className="patient-active-toggle">
            <input
              type="checkbox"
              checked={patientFormState.active}
              onChange={(event) =>
                setPatientFormState((previous) => ({ ...previous, active: event.target.checked }))
              }
            />
            <span>Patient record is active</span>
          </label>

          <div className="service-form-actions">
            <button type="submit" className="btn btn-primary" disabled={isSubmittingPatient}>
              {isSubmittingPatient
                ? editingPatientId
                  ? "Saving..."
                  : "Adding..."
                : editingPatientId
                  ? "Save Patient"
                  : "Add Patient"}
            </button>
            {editingPatientId ? (
              <button type="button" className="btn btn-ghost" onClick={handleCancelPatientEdit}>
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>
      </article>

      {patientValidationError ? <p className="result-note error-note">{patientValidationError}</p> : null}

      {patientSubmitError ? <p className="result-note error-note">{formatError(patientSubmitError)}</p> : null}

      {patientsQuery.isLoading ? (
        <article className="access-note">
          <h2>Loading patients</h2>
          <p>Fetching patient records...</p>
        </article>
      ) : null}

      {patientsQuery.isError ? (
        <article className="access-note error-block">
          <h2>Could not load patients</h2>
          <p>{formatError(patientsQuery.error)}</p>
        </article>
      ) : null}

      {patientsQuery.data ? (
        <article className="org-table-card">
          {patientsQuery.data.length === 0 ? (
            <p className="org-empty">No patients found for your current search.</p>
          ) : (
            <div className="org-table-wrap">
              <table className="org-table">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Date of Birth</th>
                    <th>Gender</th>
                    <th>Primary Phone</th>
                    <th>Active</th>
                    <th>Address</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patientsQuery.data.map((patient) => {
                    const patientId = patient.id ?? "";
                    const patientName = patient.full_name ?? "Unnamed patient";

                    return (
                      <tr key={patientId || patientName}>
                        <td>{patientName}</td>
                        <td>{patient.date_of_birth ?? "-"}</td>
                        <td>{patient.gender ?? "-"}</td>
                        <td>{patient.primary_phone ?? "-"}</td>
                        <td>{patient.active === true ? "Yes" : "No"}</td>
                        <td>{summarizeAddress(patient)}</td>
                        <td>
                          <div className="org-actions">
                            <button
                              type="button"
                              className="btn btn-ghost org-btn"
                              disabled={!patientId}
                              onClick={() => handleEditPatient(patient)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline org-btn"
                              disabled={!patientId || deletePatientMutation.isPending}
                              onClick={() => setDeletingPatient({ id: patientId, name: patientName })}
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

      {deletePatientMutation.isError ? (
        <p className="result-note error-note">{formatError(deletePatientMutation.error)}</p>
      ) : null}

      {deletingPatient ? (
        <div className="dialog-backdrop" role="presentation">
          <article className="dialog-card" role="alertdialog" aria-modal="true" aria-labelledby="delete-patient-title">
            <h2 id="delete-patient-title">Delete patient?</h2>
            <p>
              Are you sure you wish to delete <strong>{deletingPatient.name}</strong>? This action cannot be undone.
            </p>
            <div className="dialog-actions">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={deletePatientMutation.isPending}
                onClick={() => setDeletingPatient(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-outline"
                disabled={deletePatientMutation.isPending}
                onClick={handleConfirmDeletePatient}
              >
                {deletePatientMutation.isPending ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </article>
        </div>
      ) : null}
    </section>
  );
}

export default OrganizationPatientsPage;


