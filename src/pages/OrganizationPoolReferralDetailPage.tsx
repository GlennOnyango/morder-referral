import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { getOrganizationById, validateOrganizationFacilityCode } from "../api/organizations";
import {
  acceptReferralByCode,
  createReferralInformationRequest,
  getReferralByCode,
  streamReferralSummaryByCode,
} from "../api/referrals";
import Breadcrumbs from "../components/Breadcrumbs";
import DialogPortal from "../components/DialogPortal";
import { useAuthContext } from "../context/AuthContext";
import { ModelsReferralStatus } from "../types/referrals.generated";
import { canAccessOrganization, isFacilityManager } from "../utils/facilityAccess";

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

function formatDateTime(value?: string): string {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function readOnlyValue(value?: string | number): string {
  if (typeof value === "number") {
    return value.toString();
  }

  return value ?? "";
}

function formatDateOfBirthEpoch(value?: number): string {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    return "-";
  }

  // The API may return year-of-birth (e.g. 1988) or unix time.
  if (value >= 1900 && value <= 2100) {
    return value.toString();
  }

  const milliseconds = value < 1_000_000_000_000 ? value * 1000 : value;
  const parsed = new Date(milliseconds);
  if (Number.isNaN(parsed.getTime())) {
    return value.toString();
  }

  return parsed.toLocaleDateString();
}

function normalizeCode(value?: string): string {
  return value?.trim().toLowerCase() ?? "";
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function OrganizationPoolReferralDetailPage() {
  const { id, referralCode: referralCodeParam } = useParams<{ id: string; referralCode: string }>();
  const organizationId = id ?? "";
  const referralCode = safeDecode((referralCodeParam ?? "").trim());
  const { session, isAuthenticated } = useAuthContext();
  const role = session?.role;
  const canManageReferrals = isFacilityManager(role);
  const queryClient = useQueryClient();
  const [acceptSuccessMessage, setAcceptSuccessMessage] = useState<string | null>(null);
  const [isRequestInfoDialogOpen, setIsRequestInfoDialogOpen] = useState(false);
  const [requestInfoTitle, setRequestInfoTitle] = useState("");
  const [requestInfoDescription, setRequestInfoDescription] = useState("");
  const [requestInfoSuccessMessage, setRequestInfoSuccessMessage] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState("");
  const [aiSummaryRequested, setAiSummaryRequested] = useState(false);

  const organizationQuery = useQuery({
    queryKey: ["organizations", "detail", organizationId, session?.accessToken],
    queryFn: () => getOrganizationById(organizationId, session?.accessToken),
    enabled: canManageReferrals && organizationId.length > 0,
  });

  const hasFacilityAccess = canAccessOrganization(role, session?.facilityId, organizationQuery.data);
  const facilityCode = organizationQuery.data?.facility_code?.trim() ?? "";

  const referralDetailQuery = useQuery({
    queryKey: ["referral-detail", organizationId, referralCode, session?.accessToken],
    queryFn: () => getReferralByCode(referralCode, session?.accessToken),
    enabled: canManageReferrals && referralCode.length > 0 && hasFacilityAccess,
  });

  const acceptReferralMutation = useMutation({
    mutationFn: () =>
      acceptReferralByCode(
        referralCode,
        {
          facilityCode,
        },
        session?.accessToken,
      ),
    onSuccess: async (acceptedReferral) => {
      setAcceptSuccessMessage(
        acceptedReferral.referralCode
          ? `Referral ${acceptedReferral.referralCode} accepted successfully.`
          : "Referral accepted successfully.",
      );
      await queryClient.invalidateQueries({ queryKey: ["referral-pool", organizationId] });
      await queryClient.invalidateQueries({ queryKey: ["facility-referrals", organizationId] });
      await queryClient.invalidateQueries({ queryKey: ["referral-detail", organizationId, referralCode] });
    },
  });

  const requestInfoMutation = useMutation({
    mutationFn: async () => {
      const referralId = referralDetailQuery.data?.id?.trim() ?? "";
      if (!referralId) {
        throw new Error("Missing referral id for this referral.");
      }

      const originFacilityCode = referralDetailQuery.data?.originFacilityCode?.trim() ?? "";
      if (!originFacilityCode) {
        throw new Error("Missing origin facility code for this referral.");
      }

      const originFacilityValidation = await validateOrganizationFacilityCode(originFacilityCode);
      const originFacilityId = originFacilityValidation.facilityId?.trim() ?? "";
      if (!originFacilityValidation.exists || !originFacilityId) {
        throw new Error(`Could not resolve facility id for origin facility code ${originFacilityCode}.`);
      }

      return createReferralInformationRequest(
        referralId,
        {
          facilityId: originFacilityId,
          title: requestInfoTitle.trim(),
          additionalInformation: requestInfoDescription.trim(),
        },
        session?.accessToken,
      );
    },
    onSuccess: async () => {
      setIsRequestInfoDialogOpen(false);
      setRequestInfoSuccessMessage(`Additional information request sent for referral ${referralCode}.`);
      await queryClient.invalidateQueries({ queryKey: ["referral-notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["referral-detail", organizationId, referralCode] });
    },
  });

  const summarizeCaseMutation = useMutation({
    mutationFn: () =>
      streamReferralSummaryByCode(
        referralCode,
        (chunk) => {
          setAiSummary((currentSummary) => `${currentSummary}${chunk}`);
        },
        session?.accessToken,
      ),
    onMutate: () => {
      setAiSummaryRequested(true);
      setAiSummary("");
    },
  });

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  if (!canManageReferrals) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!organizationId) {
    return <Navigate to="/facilities" replace />;
  }

  if (!referralCode) {
    return <Navigate to={`/facilities/${organizationId}/referrals`} replace />;
  }

  if (role === "HOSPITAL_ADMIN" && !session?.facilityId) {
    return <Navigate to="/dashboard" replace />;
  }

  if (organizationQuery.data && !canAccessOrganization(role, session?.facilityId, organizationQuery.data)) {
    return <Navigate to="/dashboard" replace />;
  }

  const facilityName = organizationQuery.data?.name ?? organizationQuery.data?.facility_code ?? "Facility";
  const referral = referralDetailQuery.data;
  const patient = referral?.patient;
  const isSameFacilityReferral =
    normalizeCode(facilityCode).length > 0 &&
    normalizeCode(facilityCode) === normalizeCode(referral?.originFacilityCode);
  const canAcceptReferral =
    !isSameFacilityReferral &&
    facilityCode.length > 0 &&
    referral?.status === ModelsReferralStatus.ReferralStatusOpen;
  const canRequestInformation = canAcceptReferral && Boolean(referral?.id?.trim());

  const handleOpenRequestInfoDialog = () => {
    setRequestInfoTitle("");
    setRequestInfoDescription("");
    setRequestInfoSuccessMessage(null);
    setIsRequestInfoDialogOpen(true);
  };

  const handleCloseRequestInfoDialog = () => {
    setIsRequestInfoDialogOpen(false);
  };

  const handleRequestInfoSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!requestInfoTitle.trim() || !requestInfoDescription.trim()) {
      return;
    }

    requestInfoMutation.mutate();
  };

  return (
    <section className="org-shell reveal delay-1">
      <div className="org-header">
        <div>
          <p className="eyebrow">Referrals</p>
          <h1>Open Referral Detail</h1>
          <p>Review all details before taking a referral action.</p>
        </div>
        <div className="org-actions">
          <Link className="btn btn-ghost org-btn" to={`/facilities/${organizationId}/referrals`}>
            Back to Open Referrals
          </Link>
          <Link className="btn btn-ghost org-btn" to={`/facilities/${organizationId}/referrals/facility`}>
            View Facility Referrals
          </Link>
        </div>
      </div>

      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: "Dashboard", to: "/dashboard" },
          { label: "Facilities", to: "/facilities" },
          { label: facilityName, to: `/facilities/${organizationId}` },
          { label: "Referrals", to: `/facilities/${organizationId}/referrals` },
          { label: referralCode },
        ]}
      />

      {organizationQuery.isError ? (
        <article className="access-note error-block">
          <h2>Could not load facility</h2>
          <p>{formatError(organizationQuery.error)}</p>
        </article>
      ) : null}

      {organizationQuery.data && !facilityCode ? (
        <article className="access-note error-block">
          <h2>Missing facility code</h2>
          <p>This facility does not have a facility code, so referral acceptance is unavailable.</p>
        </article>
      ) : null}

      {referralDetailQuery.isLoading ? <p className="org-empty">Loading referral details...</p> : null}
      {referralDetailQuery.isError ? (
        <p className="result-note error-note">{formatError(referralDetailQuery.error)}</p>
      ) : null}

      {referral ? (
        <article className="org-form-card">
          <div className="referral-detail-card-header">
            <h2>Referral Details</h2>
            <button
              type="button"
              className="btn btn-ghost org-btn referral-ai-action-btn"
              onClick={() => {
                setAcceptSuccessMessage(null);
                setRequestInfoSuccessMessage(null);
                summarizeCaseMutation.mutate();
              }}
              disabled={summarizeCaseMutation.isPending}
            >
              <span className="referral-ai-action-content">
                <span className="referral-ai-action-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                    <path
                      d="M12 2.5l1.9 5.2 5.6 1.9-5.6 1.9L12 16.7l-1.9-5.2-5.6-1.9 5.6-1.9L12 2.5Zm7.2 11.8.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9.9-2.4ZM6 15.6l.8 2.1 2.1.8-2.1.8L6 21.4l-.8-2.1-2.1-.8 2.1-.8.8-2.1Z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
                <span className="referral-ai-action-copy">
                  <span className="referral-ai-action-label">
                    {summarizeCaseMutation.isPending ? "Summarising with AI..." : "Generate Summary with AI"}
                  </span>
                  <span className="referral-ai-action-subtitle">Clinical highlights and risks</span>
                </span>
              </span>
            </button>
          </div>

          {aiSummaryRequested ? (
            <section className="referral-ai-summary-card" aria-live="polite">
              <div className="referral-ai-summary-head">
                <p>AI Summary</p>
                {summarizeCaseMutation.isPending ? <span className="referral-ai-summary-chip">Generating</span> : null}
              </div>
              {summarizeCaseMutation.isError ? (
                <p className="result-note error-note referral-ai-summary-note">{formatError(summarizeCaseMutation.error)}</p>
              ) : null}
              {aiSummary ? (
                <p className="referral-ai-summary-content">{aiSummary}</p>
              ) : summarizeCaseMutation.isPending ? (
                <p className="referral-ai-summary-placeholder">Preparing a concise clinical summary from this referral...</p>
              ) : (
                <p className="referral-ai-summary-placeholder">No summary was returned. Try again in a moment.</p>
              )}
            </section>
          ) : null}

          <div className="org-form">
            <div className="org-grid">
              <label className="field">
                <span>Referral Code</span>
                <input className="field-input referral-readonly-input" value={readOnlyValue(referral.referralCode)} readOnly />
              </label>
              <label className="field">
                <span>Status</span>
                <input className="field-input referral-readonly-input" value={readOnlyValue(referral.status)} readOnly />
              </label>
            </div>

            <div className="org-grid">
              <label className="field">
                <span>Service Type</span>
                <input className="field-input referral-readonly-input" value={readOnlyValue(referral.serviceType)} readOnly />
              </label>
              <label className="field">
                <span>Priority</span>
                <input className="field-input referral-readonly-input" value={readOnlyValue(referral.priority)} readOnly />
              </label>
            </div>

            <label className="field">
              <span>Reason for Referral</span>
              <textarea
                className="field-input service-notes referral-readonly-input"
                rows={3}
                value={readOnlyValue(referral.reasonForReferral)}
                readOnly
              />
            </label>

            <div className="org-grid">
              <label className="field">
                <span>Clinical Summary</span>
                <textarea
                  className="field-input service-notes referral-readonly-input"
                  rows={3}
                  value={readOnlyValue(referral.clinicalSummary)}
                  readOnly
                />
              </label>
              <label className="field">
                <span>Referral Notes</span>
                <textarea
                  className="field-input service-notes referral-readonly-input"
                  rows={3}
                  value={readOnlyValue(referral.notes)}
                  readOnly
                />
              </label>
            </div>

            <div className="org-grid">
              <label className="field">
                <span>Origin Facility</span>
                <input
                  className="field-input referral-readonly-input"
                  value={readOnlyValue(referral.originFacilityCode)}
                  readOnly
                />
              </label>
              <label className="field">
                <span>Accepted Facility</span>
                <input
                  className="field-input referral-readonly-input"
                  value={readOnlyValue(referral.acceptedByFacilityCode)}
                  readOnly
                />
              </label>
            </div>

            <div className="org-grid">
              <label className="field">
                <span>Raised By</span>
                <input
                  className="field-input referral-readonly-input"
                  value={readOnlyValue(referral.raisedByUsername ?? referral.raisedBySub)}
                  readOnly
                />
              </label>
              <label className="field">
                <span>Accepted At</span>
                <input className="field-input referral-readonly-input" value={formatDateTime(referral.acceptedAt)} readOnly />
              </label>
            </div>

            <div className="org-grid">
              <label className="field">
                <span>Created At</span>
                <input className="field-input referral-readonly-input" value={formatDateTime(referral.createdAt)} readOnly />
              </label>
              <label className="field">
                <span>Updated At</span>
                <input className="field-input referral-readonly-input" value={formatDateTime(referral.updatedAt)} readOnly />
              </label>
            </div>

            <h3>Patient Details</h3>
            <div className="org-grid">
              <label className="field">
                <span>Full Name</span>
                <input className="field-input referral-readonly-input" value={readOnlyValue(patient?.fullName)} readOnly />
              </label>
              <label className="field">
                <span>Date of Birth</span>
                <input
                  className="field-input referral-readonly-input"
                  value={formatDateOfBirthEpoch(patient?.dateOfBirth)}
                  readOnly
                />
              </label>
            </div>

            <label className="field">
              <span>Gender</span>
              <input className="field-input referral-readonly-input" value={readOnlyValue(patient?.gender)} readOnly />
            </label>

            <label className="field">
              <span>Diagnosis</span>
              <textarea
                className="field-input service-notes referral-readonly-input"
                rows={2}
                value={readOnlyValue(patient?.diagnosis)}
                readOnly
              />
            </label>

            <div className="org-grid">
              <label className="field">
                <span>Allergies</span>
                <textarea
                  className="field-input service-notes referral-readonly-input"
                  rows={2}
                  value={readOnlyValue(patient?.allergies)}
                  readOnly
                />
              </label>
              <label className="field">
                <span>Vital Summary</span>
                <textarea
                  className="field-input service-notes referral-readonly-input"
                  rows={2}
                  value={readOnlyValue(patient?.vitalSummary)}
                  readOnly
                />
              </label>
            </div>

            <label className="field">
              <span>Additional Notes</span>
              <textarea
                className="field-input service-notes referral-readonly-input"
                rows={2}
                value={readOnlyValue(patient?.additionalNotes)}
                readOnly
              />
            </label>
          </div>

          <div className="service-form-actions referral-detail-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setAcceptSuccessMessage(null);
                setRequestInfoSuccessMessage(null);
                acceptReferralMutation.mutate();
              }}
              disabled={!canAcceptReferral || acceptReferralMutation.isPending}
            >
              {acceptReferralMutation.isPending ? "Accepting..." : "Accept Referral"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setAcceptSuccessMessage(null);
                handleOpenRequestInfoDialog();
              }}
              disabled={!canRequestInformation}
            >
              Request More Information
            </button>
          </div>

          {isSameFacilityReferral ? (
            <p className="org-section-note">
              Action unavailable because this referral belongs to the same facility.
            </p>
          ) : null}

          {referral.status !== ModelsReferralStatus.ReferralStatusOpen ? (
            <p className="org-section-note">
              This referral is currently <strong>{referral.status ?? "unavailable"}</strong> and cannot be accepted.
            </p>
          ) : null}
        </article>
      ) : null}

      {acceptReferralMutation.isError ? (
        <p className="result-note error-note">{formatError(acceptReferralMutation.error)}</p>
      ) : null}
      {requestInfoMutation.isError ? (
        <p className="result-note error-note">{formatError(requestInfoMutation.error)}</p>
      ) : null}
      {acceptSuccessMessage ? <p className="result-note success-note">{acceptSuccessMessage}</p> : null}
      {requestInfoSuccessMessage ? <p className="result-note success-note">{requestInfoSuccessMessage}</p> : null}

      {isRequestInfoDialogOpen ? (
        <DialogPortal>
          <div className="dialog-backdrop" role="presentation">
            <article
              className="dialog-card referral-request-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="request-info-title"
            >
              <h2 id="request-info-title">Request More Information</h2>
              <p>Add a title and description for the information you need from the originating facility.</p>

              <form className="org-form" onSubmit={handleRequestInfoSubmit}>
                <label className="field" htmlFor="request-info-dialog-title">
                  <span>Title</span>
                  <input
                    id="request-info-dialog-title"
                    className="field-input"
                    value={requestInfoTitle}
                    onChange={(event) => setRequestInfoTitle(event.target.value)}
                    placeholder="e.g. Missing lab results"
                    required
                  />
                </label>

                <label className="field" htmlFor="request-info-dialog-description">
                  <span>Description</span>
                  <textarea
                    id="request-info-dialog-description"
                    className="field-input service-notes"
                    rows={4}
                    value={requestInfoDescription}
                    onChange={(event) => setRequestInfoDescription(event.target.value)}
                    placeholder="Describe the additional details or documents required."
                    required
                  />
                </label>

                <div className="dialog-actions">
                  <button type="button" className="btn btn-ghost" onClick={handleCloseRequestInfoDialog}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={requestInfoMutation.isPending}>
                    {requestInfoMutation.isPending ? "Sending..." : "Send Request"}
                  </button>
                </div>
              </form>
            </article>
          </div>
        </DialogPortal>
      ) : null}
    </section>
  );
}

export default OrganizationPoolReferralDetailPage;
