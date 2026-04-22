import { Button } from "../../components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useState } from "react";
import type { SubmitEvent } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { getOrganizationById } from "../../api/organizations";
import { createReferral, type ReferralCreateInput } from "../../api/referrals";
import Breadcrumbs from "../../components/Breadcrumbs";
import { useAuthContext } from "../../context/useAuthContext";
import { canAccessOrganization, isFacilityManager } from "../../utils/facilityAccess";

type ReferralFormState = {
  serviceType: string;
  priority: string;
  modeOfPayment: string;
  insuranceProvider: string;
  patientFullName: string;
  patientYearOfBirth: string;
  patientGender: string;
  patientDiagnosis: string;
  reasonForReferral: string;
  clinicalSummary: string;
  notes: string;
};

type ReferralStep = {
  key: string;
  label: string;
};

const referralSteps: ReferralStep[] = [
  { key: "patient-details", label: "Patient Personal Details" },
  { key: "payment-details", label: "Payment Details" },
  { key: "diagnosis", label: "Diagnosis" },
];

const defaultReferralFormState: ReferralFormState = {
  serviceType: "",
  priority: "routine",
  modeOfPayment: "cash",
  insuranceProvider: "",
  patientFullName: "",
  patientYearOfBirth: "",
  patientGender: "male",
  patientDiagnosis: "",
  reasonForReferral: "",
  clinicalSummary: "",
  notes: "",
};

const kenyaInsuranceFirms = [
  "AAR Insurance Kenya",
  "Africa Merchant Assurance Company (AMACO)",
  "APA Insurance",
  "Britam General Insurance",
  "CIC General Insurance",
  "Directline Assurance",
  "First Assurance",
  "GA Insurance",
  "Geminia Insurance",
  "Heritage Insurance",
  "ICEA LION General Insurance",
  "Intra Africa Assurance",
  "Jubilee Allianz General Insurance",
  "Kenindia Assurance",
  "Kenya Orient Insurance",
  "Madison General Insurance",
  "Mayfair Insurance",
  "MUA Insurance Kenya",
  "Occidental Insurance",
  "Old Mutual General Insurance Kenya",
  "Pioneer General Insurance",
  "Sanlam General Insurance",
  "Takaful Insurance of Africa",
  "The Kenyan Alliance Insurance",
  "Trident Insurance",
  "UAP Old Mutual Insurance",
  "Xplico Insurance",
] as const;

function getStepValidationError(stepIndex: number, formState: ReferralFormState): string | null {
  const currentYear = new Date().getFullYear();
  const patientYearOfBirth = Number(formState.patientYearOfBirth);
  const isYearOfBirthValid =
    Number.isInteger(patientYearOfBirth) && patientYearOfBirth >= 1900 && patientYearOfBirth <= currentYear;

  if (stepIndex === 0) {
    if (!formState.patientFullName.trim()) {
      return "Patient full name is required.";
    }
    if (!isYearOfBirthValid) {
      return "Please enter a valid year of birth.";
    }
    if (!formState.patientGender.trim()) {
      return "Patient gender is required.";
    }
  }

  if (stepIndex === 1) {
    if (!formState.modeOfPayment.trim()) {
      return "Mode of payment is required.";
    }
    if (formState.modeOfPayment.trim() === "insurance" && !formState.insuranceProvider.trim()) {
      return "Please select an insurance provider.";
    }
  }

  if (stepIndex === 2) {
    if (!formState.serviceType.trim()) {
      return "Service type is required.";
    }
    if (!formState.priority.trim()) {
      return "Priority is required.";
    }
    if (!formState.reasonForReferral.trim()) {
      return "Reason for referral is required.";
    }
  }

  return null;
}

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

function trimToOptional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toPayload(formState: ReferralFormState, facilityCode: string): ReferralCreateInput | null {
  const normalizedFacilityCode = facilityCode.trim();
  const serviceType = formState.serviceType.trim();
  const priority = formState.priority.trim();
  const modeOfPayment = formState.modeOfPayment.trim();
  const patientFullName = formState.patientFullName.trim();
  const patientYearOfBirth = Number(formState.patientYearOfBirth);
  const patientGender = formState.patientGender.trim();
  const reasonForReferral = formState.reasonForReferral.trim();
  const insuranceProvider =
    modeOfPayment === "insurance" ? formState.insuranceProvider.trim() : "";
  const currentYear = new Date().getFullYear();
  const isYearOfBirthValid =
    Number.isInteger(patientYearOfBirth) && patientYearOfBirth >= 1900 && patientYearOfBirth <= currentYear;
  const patientDateOfBirthValue = isYearOfBirthValid ? patientYearOfBirth : NaN;

  if (
    !normalizedFacilityCode ||
    !serviceType ||
    !priority ||
    !modeOfPayment ||
    !patientFullName ||
    !patientGender ||
    Number.isNaN(patientDateOfBirthValue) ||
    !reasonForReferral
  ) {
    return null;
  }

  return {
    originFacilityCode: normalizedFacilityCode,
    serviceType,
    priority,
    modeOfPayment,
    metadata: insuranceProvider ? { insuranceProvider } : undefined,
    reasonForReferral,
    clinicalSummary: trimToOptional(formState.clinicalSummary),
    notes: trimToOptional(formState.notes),
    patient: {
      fullName: patientFullName,
      dateOfBirth: patientDateOfBirthValue,
      gender: patientGender,
      diagnosis: trimToOptional(formState.patientDiagnosis),
    },
  };
}

function OrganizationCreateReferralPage() {
  const { id } = useParams<{ id: string }>();
  const organizationId = id ?? "";
  const navigate = useNavigate();
  const { session, isAuthenticated } = useAuthContext();
  const role = session?.role;
  const canManageReferrals = isFacilityManager(role);
  const queryClient = useQueryClient();

  const [formState, setFormState] = useState<ReferralFormState>(defaultReferralFormState);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [validationError, setValidationError] = useState<string | null>(null);

  const organizationQuery = useQuery({
    queryKey: ["organizations", "detail", organizationId, session?.accessToken],
    queryFn: () => getOrganizationById(organizationId, session?.accessToken),
    enabled: canManageReferrals && organizationId.length > 0,
  });

  const facilityCode = organizationQuery.data?.facility_code?.trim() ?? "";

  const createReferralMutation = useMutation({
    mutationFn: (payload: ReferralCreateInput) => createReferral(payload, session?.accessToken),
    onSuccess: async () => {
      setValidationError(null);
      await queryClient.invalidateQueries({ queryKey: ["referral-pool", organizationId] });
      await queryClient.invalidateQueries({ queryKey: ["facility-referrals", organizationId] });
      navigate(`/facilities/${organizationId}/referrals`, { replace: true });
    },
  });

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);

    const stepError = getStepValidationError(currentStep, formState);
    if (stepError) {
      setValidationError(stepError);
      return;
    }

    const payload = toPayload(formState, facilityCode);
    if (!payload) {
      setValidationError(
        "Service type, priority, mode of payment, patient full name, valid year of birth, gender, and reason for referral are required.",
      );
      return;
    }

    createReferralMutation.mutate(payload);
  };

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  if (!canManageReferrals) {
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

  const facilityName = organizationQuery.data?.name ?? organizationQuery.data?.facility_code ?? "Facility";
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === referralSteps.length - 1;

  const handlePreviousStep = () => {
    if (isFirstStep) {
      return;
    }
    setValidationError(null);
    setCurrentStep((previous) => Math.max(0, previous - 1));
  };

  const handleNextStep = () => {
    const stepError = getStepValidationError(currentStep, formState);
    if (stepError) {
      setValidationError(stepError);
      return;
    }
    setValidationError(null);
    setCurrentStep((previous) => Math.min(referralSteps.length - 1, previous + 1));
  };

  const handleModeOfPaymentChange = (modeOfPayment: string) => {
    setFormState((previous) => ({
      ...previous,
      modeOfPayment,
      insuranceProvider: modeOfPayment === "insurance" ? previous.insuranceProvider : "",
    }));
  };

  return (
    <section className="org-shell reveal delay-1">
      <div className="org-header">
        <div>
          <p className="eyebrow">Referrals</p>
          <h1>Create Referral</h1>
          <p>Raise a new referral for this facility.</p>
        </div>
        <div className="org-actions">
          <Link className="btn btn-ghost org-btn" to={`/facilities/${organizationId}/referrals`}>
            Back to Referrals
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
          { label: "Create" },
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
          <p>This facility does not have a facility code, so a referral cannot be created.</p>
        </article>
      ) : null}

      <article className="org-form-card">
        <form className="org-form" onSubmit={handleSubmit}>
          <ol className="referral-stepper" aria-label="Create referral steps">
            {referralSteps.map((step, index) => {
              const statusClassName =
                index === currentStep ? "is-active" : index < currentStep ? "is-complete" : "is-upcoming";
              return (
                <li key={step.key} className={`referral-stepper-item ${statusClassName}`}>
                  <Button
                    type="button"
                    className="referral-stepper-btn"
                    onClick={() => {
                      setValidationError(null);
                      setCurrentStep(index);
                    }}
                    aria-current={index === currentStep ? "step" : undefined}
                  >
                    <span className="referral-stepper-index">{index + 1}</span>
                    <span className="referral-stepper-label">{step.label}</span>
                  </Button>
                </li>
              );
            })}
          </ol>

          <div className="referral-step-heading">
            <p className="eyebrow">Step {currentStep + 1}</p>
            <h2>{referralSteps[currentStep]?.label}</h2>
          </div>

          {currentStep === 0 ? (
            <div className="org-grid">
              <label className="field">
                <span>Patient Full Name *</span>
                <input
                  className="field-input"
                  value={formState.patientFullName}
                  onChange={(event) =>
                    setFormState((previous) => ({ ...previous, patientFullName: event.target.value }))
                  }
                  placeholder="e.g. John Doe"
                  required
                />
              </label>
              <label className="field">
                <span>Year of Birth *</span>
                <input
                  className="field-input"
                  type="number"
                  min={1900}
                  max={new Date().getFullYear()}
                  step={1}
                  value={formState.patientYearOfBirth}
                  onChange={(event) =>
                    setFormState((previous) => ({ ...previous, patientYearOfBirth: event.target.value }))
                  }
                  placeholder="e.g. 1988"
                  required
                />
              </label>

              <label className="field">
                <span>Gender *</span>
                <select
                  className="field-input"
                  value={formState.patientGender}
                  onChange={(event) =>
                    setFormState((previous) => ({ ...previous, patientGender: event.target.value }))
                  }
                  required
                >
                  <option value="male">male</option>
                  <option value="female">female</option>
                </select>
              </label>
            </div>
          ) : null}

          {currentStep === 1 ? (
            <div className="org-grid">
              <label className="field">
                <span>Mode of Payment *</span>
                <select
                  className="field-input"
                  value={formState.modeOfPayment}
                  onChange={(event) => handleModeOfPaymentChange(event.target.value)}
                  required
                >
                  <option value="cash">cash</option>
                  <option value="mpesa">mpesa</option>
                  <option value="insurance">insurance</option>
                </select>
              </label>
              <label className="field">
                <span>Insurance Provider {formState.modeOfPayment === "insurance" ? "*" : ""}</span>
                <select
                  className="field-input"
                  value={formState.insuranceProvider}
                  onChange={(event) =>
                    setFormState((previous) => ({ ...previous, insuranceProvider: event.target.value }))
                  }
                  disabled={formState.modeOfPayment !== "insurance"}
                  required={formState.modeOfPayment === "insurance"}
                >
                  <option value="">Select insurance provider</option>
                  {kenyaInsuranceFirms.map((insurer) => (
                    <option key={insurer} value={insurer}>
                      {insurer}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <>
              <div className="org-grid">
                <label className="field">
                  <span>Service Type *</span>
                  <input
                    className="field-input"
                    value={formState.serviceType}
                    onChange={(event) => setFormState((previous) => ({ ...previous, serviceType: event.target.value }))}
                    placeholder="e.g. radiology"
                    required
                  />
                </label>
                <label className="field">
                  <span>Priority *</span>
                  <select
                    className="field-input"
                    value={formState.priority}
                    onChange={(event) => setFormState((previous) => ({ ...previous, priority: event.target.value }))}
                    required
                  >
                    <option value="routine">routine</option>
                    <option value="urgent">urgent</option>
                    <option value="emergency">emergency</option>
                  </select>
                </label>
              </div>

              <label className="field">
                <span>Diagnosis</span>
                <input
                  className="field-input"
                  value={formState.patientDiagnosis}
                  onChange={(event) => setFormState((previous) => ({ ...previous, patientDiagnosis: event.target.value }))}
                  placeholder="e.g. Suspected appendicitis"
                />
              </label>

              <label className="field">
                <span>Reason for Referral *</span>
                <textarea
                  className="field-input service-notes"
                  rows={3}
                  value={formState.reasonForReferral}
                  onChange={(event) =>
                    setFormState((previous) => ({ ...previous, reasonForReferral: event.target.value }))
                  }
                  placeholder="Briefly explain why this referral is needed"
                  required
                />
              </label>

              <div className="org-grid">
                <label className="field">
                  <span>Clinical Summary</span>
                  <textarea
                    className="field-input service-notes"
                    rows={3}
                    value={formState.clinicalSummary}
                    onChange={(event) =>
                      setFormState((previous) => ({ ...previous, clinicalSummary: event.target.value }))
                    }
                    placeholder="Current condition, key findings, and stabilization provided"
                  />
                </label>
                <label className="field">
                  <span>Referral Notes</span>
                  <textarea
                    className="field-input service-notes"
                    rows={3}
                    value={formState.notes}
                    onChange={(event) => setFormState((previous) => ({ ...previous, notes: event.target.value }))}
                    placeholder="Any additional notes for receiving facility"
                  />
                </label>
              </div>
            </>
          ) : null}

          <div className="service-form-actions referral-step-actions">
            <Button type="button" className="btn btn-ghost" onClick={handlePreviousStep} disabled={isFirstStep || createReferralMutation.isPending}>
              Back
            </Button>
            {!isLastStep ? (
              <Button type="button" className="btn btn-primary" onClick={handleNextStep} disabled={createReferralMutation.isPending}>
                Next
              </Button>
            ) : (
              <Button type="submit" className="btn btn-primary" disabled={createReferralMutation.isPending || !facilityCode}>
                {createReferralMutation.isPending ? "Creating..." : "Create Referral"}
              </Button>
            )}
          </div>
        </form>
      </article>

      {validationError ? <p className="result-note error-note">{validationError}</p> : null}
      {createReferralMutation.isError ? (
        <p className="result-note error-note">{formatError(createReferralMutation.error)}</p>
      ) : null}
    </section>
  );
}

export default OrganizationCreateReferralPage;
