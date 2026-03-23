import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { getOrganizationById } from "../api/organizations";
import { acceptReferralByCode, getReferralByCode } from "../api/referrals";
import Breadcrumbs from "../components/Breadcrumbs";
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

function readOnlyValue(value?: string): string {
  return value ?? "";
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
  const canAcceptReferral =
    facilityCode.length > 0 && referral?.status === ModelsReferralStatus.ReferralStatusOpen;

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
          <h2>Referral Details</h2>
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
                <input className="field-input referral-readonly-input" value={readOnlyValue(patient?.dateOfBirth)} readOnly />
              </label>
            </div>

            <div className="org-grid">
              <label className="field">
                <span>Gender</span>
                <input className="field-input referral-readonly-input" value={readOnlyValue(patient?.gender)} readOnly />
              </label>
              <label className="field">
                <span>Phone</span>
                <input className="field-input referral-readonly-input" value={readOnlyValue(patient?.phone)} readOnly />
              </label>
            </div>

            <div className="org-grid">
              <label className="field">
                <span>National ID</span>
                <input className="field-input referral-readonly-input" value={readOnlyValue(patient?.nationalId)} readOnly />
              </label>
              <label className="field">
                <span>Medical Record Number</span>
                <input
                  className="field-input referral-readonly-input"
                  value={readOnlyValue(patient?.medicalRecordNumber)}
                  readOnly
                />
              </label>
            </div>

            <label className="field">
              <span>Diagnosis</span>
              <textarea
                className="field-input service-notes referral-readonly-input"
                rows={2}
                value={readOnlyValue(patient?.diagnosis)}
                readOnly
              />
            </label>

            <label className="field">
              <span>Address</span>
              <textarea
                className="field-input service-notes referral-readonly-input"
                rows={2}
                value={readOnlyValue(patient?.address)}
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

            <div className="org-grid">
              <label className="field">
                <span>Next of Kin Name</span>
                <input className="field-input referral-readonly-input" value={readOnlyValue(patient?.nextOfKinName)} readOnly />
              </label>
              <label className="field">
                <span>Next of Kin Phone</span>
                <input className="field-input referral-readonly-input" value={readOnlyValue(patient?.nextOfKinPhone)} readOnly />
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
                acceptReferralMutation.mutate();
              }}
              disabled={!canAcceptReferral || acceptReferralMutation.isPending}
            >
              {acceptReferralMutation.isPending ? "Accepting..." : "Accept Referral"}
            </button>
            <button type="button" className="btn btn-ghost" disabled>
              Request More Information
            </button>
          </div>

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
      {acceptSuccessMessage ? <p className="result-note success-note">{acceptSuccessMessage}</p> : null}
    </section>
  );
}

export default OrganizationPoolReferralDetailPage;
