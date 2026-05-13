import { Pencil, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {  useParams } from "react-router-dom";
import { useWorkspace } from "../../../context/WorkspaceContext";
import { useGetOrganizationById } from "../../../api/hooks/organizations/OrganizationById.hook";
import { useGetReferralByCode } from "../../../api/hooks/referrals/ReferralByCode.hook";
import { usePatchReferral } from "../../../api/hooks/referrals/PatchReferral.hook";
import Breadcrumbs from "../../../components/Breadcrumbs";
import { PriorityBadge, StatusBadge } from "../../../components/ReferralBadges";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { useAuthContext } from "../../../context/useAuthContext";
import type { ModelsReferral } from "../../../types/referrals.generated";
import {
  formatError,
  formatDateTime,
  formatFieldValue,
  formatDateOfBirthEpoch,
  safeDecode,
} from "../../../utils/format";
import type { ReferralUpdateInput } from "../../../api/referrals";
import InfoField from "./components/InfoField";
import InfoFieldLong from "./components/InfoFieldLong";
import EditField from "./components/EditField";
import EditTextarea from "./components/EditTextarea";
import HistoryTimeline from "./components/HistoryTimeline";
import ServiceRequestsSection from "./components/ServiceRequestsSection";

type EditState = {
  serviceType: string;
  priority: string;
  reasonForReferral: string;
  clinicalSummary: string;
  notes: string;
  patientFullName: string;
  patientDob: string;
  patientGender: string;
  patientDiagnosis: string;
  patientAllergies: string;
  patientVitalSummary: string;
  patientAdditionalNotes: string;
};

function referralToEditState(referral: ModelsReferral): EditState {
  const dob = referral.patient?.dateOfBirth;
  const dobStr =
    typeof dob === "number" && dob > 0
      ? dob >= 1900 && dob <= 2100
        ? String(dob)
        : new Date(dob < 1_000_000_000_000 ? dob * 1000 : dob).getFullYear().toString()
      : "";
  return {
    serviceType: referral.serviceType ?? "",
    priority: referral.priority ?? "routine",
    reasonForReferral: referral.reasonForReferral ?? "",
    clinicalSummary: referral.clinicalSummary ?? "",
    notes: referral.notes ?? "",
    patientFullName: referral.patient?.fullName ?? "",
    patientDob: dobStr,
    patientGender: referral.patient?.gender ?? "",
    patientDiagnosis: referral.patient?.diagnosis ?? "",
    patientAllergies: referral.patient?.allergies ?? "",
    patientVitalSummary: referral.patient?.vitalSummary ?? "",
    patientAdditionalNotes: referral.patient?.additionalNotes ?? "",
  };
}

function editStateToPayload(s: EditState): ReferralUpdateInput {
  const dobNum = Number(s.patientDob);
  const validDob =
    Number.isInteger(dobNum) && dobNum >= 1900 && dobNum <= new Date().getFullYear()
      ? dobNum
      : undefined;
  return {
    serviceType: s.serviceType.trim() || undefined,
    priority: s.priority.trim() || undefined,
    reasonForReferral: s.reasonForReferral.trim() || undefined,
    clinicalSummary: s.clinicalSummary.trim() || undefined,
    notes: s.notes.trim() || undefined,
    patient: {
      fullName: s.patientFullName.trim() || undefined,
      dateOfBirth: validDob,
      gender: s.patientGender.trim() || undefined,
      diagnosis: s.patientDiagnosis.trim() || undefined,
      allergies: s.patientAllergies.trim() || undefined,
      vitalSummary: s.patientVitalSummary.trim() || undefined,
      additionalNotes: s.patientAdditionalNotes.trim() || undefined,
    },
  };
}

function FacilityReferralDetailPage() {
  const { referralCode: referralCodeParam } = useParams<{ referralCode: string }>();
  const { workspaceId: organizationId } = useWorkspace();
  const referralCode = safeDecode((referralCodeParam ?? "").trim());
  const { session} = useAuthContext();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const organizationQuery = useGetOrganizationById(organizationId, session?.accessToken, {
    enabled:  organizationId.length > 0,
  });

 
  const referralQuery = useGetReferralByCode(referralCode, session?.accessToken, {
    enabled: referralCode.length > 0 
  });

  const patchMutation = usePatchReferral(session?.accessToken, {
    onSuccess: async () => {
      setSaveSuccess(true);
      setIsEditing(false);
      await queryClient.invalidateQueries({ queryKey: ["referrals", "detail", referralCode] });
      await queryClient.invalidateQueries({ queryKey: ["referrals", "facility"] });
    },
  });

  const referral = referralQuery.data;
  const patient = referral?.patient;

  const startEditing = () => {
    if (!referral) return;
    setEditState(referralToEditState(referral));
    setSaveSuccess(false);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditState(null);
  };

  const saveEditing = () => {
    if (!editState) return;
    patchMutation.mutate({ referralCode, payload: editStateToPayload(editState) });
  };

  const set = (key: keyof EditState) => (value: string) =>
    setEditState((prev) => (prev ? { ...prev, [key]: value } : prev));

  const facilityName =
    organizationQuery.data?.name ?? organizationQuery.data?.facility_code ?? "Facility";

  return (
    <section className="org-shell reveal delay-1">
      <Card>
        <CardContent className="flex items-start justify-between gap-3 px-5 py-4">
          <div className="flex flex-col gap-1">
            <p className="eyebrow">Facility Referrals</p>
            <h1 className="font-heading text-2xl font-semibold -tracking-[0.03em] text-slate-900 sm:text-3xl">
              {referralCode || "Referral Detail"}
            </h1>
            <p className="text-sm text-slate-500">View and manage this referral record.</p>
          </div>
          {referral && (
            <div className="flex flex-wrap items-center gap-2 pt-1 shrink-0">
              <StatusBadge status={referral.status} />
              <PriorityBadge priority={referral.priority} />
            </div>
          )}
        </CardContent>
      </Card>

      <Breadcrumbs
        items={[
          { label: facilityName, to: `/${organizationId}/organization` },
          { label: "Facility Referrals", to: `/${organizationId}/referrals/facility` },
          { label: referralCode },
        ]}
      />

      {referralQuery.isLoading && (
        <article className="access-note">
          <h2>Loading referral</h2>
          <p>Fetching referral details…</p>
        </article>
      )}
      {referralQuery.isError && (
        <article className="access-note error-block">
          <h2>Could not load referral</h2>
          <p>{formatError(referralQuery.error)}</p>
        </article>
      )}
      {organizationQuery.isError && (
        <article className="access-note error-block">
          <h2>Could not load facility</h2>
          <p>{formatError(organizationQuery.error)}</p>
        </article>
      )}

      {referral && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* ── Left: referral detail cards ── */}
          <div className="flex flex-col gap-4 lg:col-span-2">
            {/* Referral Information */}
            <Card>
              <CardContent className="flex flex-col gap-4 px-5 py-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Referral Information
                </p>
                {isEditing && editState ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <EditField
                      label="Service Type"
                      id="edit-service-type"
                      value={editState.serviceType}
                      onChange={set("serviceType")}
                      placeholder="e.g. radiology"
                    />
                    <label
                      className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                      htmlFor="edit-priority"
                    >
                      Priority
                      <Select value={editState.priority} onValueChange={set("priority")}>
                        <SelectTrigger id="edit-priority">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="routine">Routine</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                          <SelectItem value="emergency">Emergency</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                  </div>
                ) : (
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <InfoField label="Referral Code" value={formatFieldValue(referral.referralCode)} />
                    <InfoField label="Status" value={formatFieldValue(referral.status)} />
                    <InfoField label="Service Type" value={formatFieldValue(referral.serviceType)} />
                    <InfoField label="Priority" value={formatFieldValue(referral.priority)} />
                    <InfoField label="Origin Facility" value={formatFieldValue(referral.originFacilityCode)} />
                    <InfoField label="Accepted Facility" value={formatFieldValue(referral.acceptedByFacilityCode)} />
                    <InfoField
                      label="Raised By"
                      value={formatFieldValue(referral.raisedByUsername ?? referral.raisedBySub)}
                    />
                    <InfoField label="Accepted At" value={formatDateTime(referral.acceptedAt)} />
                    <InfoField label="Created At" value={formatDateTime(referral.createdAt)} />
                    <InfoField label="Updated At" value={formatDateTime(referral.updatedAt)} />
                  </dl>
                )}
              </CardContent>
            </Card>

            {/* Clinical Details */}
            <Card>
              <CardContent className="flex flex-col gap-4 px-5 py-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Clinical Details
                </p>
                {isEditing && editState ? (
                  <div className="flex flex-col gap-4">
                    <EditTextarea
                      label="Reason for Referral"
                      id="edit-reason"
                      value={editState.reasonForReferral}
                      onChange={set("reasonForReferral")}
                      placeholder="Briefly explain why this referral is needed"
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <EditTextarea
                        label="Clinical Summary"
                        id="edit-clinical-summary"
                        value={editState.clinicalSummary}
                        onChange={set("clinicalSummary")}
                        placeholder="Current condition and findings"
                      />
                      <EditTextarea
                        label="Referral Notes"
                        id="edit-notes"
                        value={editState.notes}
                        onChange={set("notes")}
                        placeholder="Any additional notes"
                      />
                    </div>
                  </div>
                ) : (
                  <dl className="flex flex-col gap-4">
                    <InfoFieldLong
                      label="Reason for Referral"
                      value={formatFieldValue(referral.reasonForReferral)}
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <InfoFieldLong label="Clinical Summary" value={formatFieldValue(referral.clinicalSummary)} />
                      <InfoFieldLong label="Referral Notes" value={formatFieldValue(referral.notes)} />
                    </div>
                  </dl>
                )}
              </CardContent>
            </Card>

            {/* Patient Details */}
            <Card>
              <CardContent className="flex flex-col gap-4 px-5 py-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Patient Details
                </p>
                {isEditing && editState ? (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <EditField
                        label="Full Name"
                        id="edit-patient-name"
                        value={editState.patientFullName}
                        onChange={set("patientFullName")}
                        placeholder="e.g. Jane Doe"
                      />
                      <EditField
                        label="Year of Birth"
                        id="edit-patient-dob"
                        value={editState.patientDob}
                        onChange={set("patientDob")}
                        placeholder="e.g. 1988"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label
                        className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                        htmlFor="edit-patient-gender"
                      >
                        Gender
                        <Select value={editState.patientGender} onValueChange={set("patientGender")}>
                          <SelectTrigger id="edit-patient-gender">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </label>
                      <EditTextarea
                        label="Diagnosis"
                        id="edit-diagnosis"
                        value={editState.patientDiagnosis}
                        onChange={set("patientDiagnosis")}
                        rows={2}
                        placeholder="e.g. Suspected appendicitis"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <EditTextarea
                        label="Allergies"
                        id="edit-allergies"
                        value={editState.patientAllergies}
                        onChange={set("patientAllergies")}
                        rows={2}
                        placeholder="Known allergies"
                      />
                      <EditTextarea
                        label="Vital Summary"
                        id="edit-vitals"
                        value={editState.patientVitalSummary}
                        onChange={set("patientVitalSummary")}
                        rows={2}
                        placeholder="Key vital signs"
                      />
                    </div>
                    <EditTextarea
                      label="Additional Notes"
                      id="edit-additional-notes"
                      value={editState.patientAdditionalNotes}
                      onChange={set("patientAdditionalNotes")}
                      rows={2}
                      placeholder="Any other relevant information"
                    />
                  </div>
                ) : (
                  <dl className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <InfoField label="Full Name" value={formatFieldValue(patient?.fullName)} />
                      <InfoField label="Date of Birth" value={formatDateOfBirthEpoch(patient?.dateOfBirth)} />
                      <InfoField label="Gender" value={formatFieldValue(patient?.gender)} />
                    </div>
                    <InfoFieldLong label="Diagnosis" value={formatFieldValue(patient?.diagnosis)} />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <InfoFieldLong label="Allergies" value={formatFieldValue(patient?.allergies)} />
                      <InfoFieldLong label="Vital Summary" value={formatFieldValue(patient?.vitalSummary)} />
                    </div>
                    <InfoFieldLong label="Additional Notes" value={formatFieldValue(patient?.additionalNotes)} />
                  </dl>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Right: actions, service requests, history ── */}
          <div className="flex flex-col gap-4">
            <Card>
              <CardContent className="flex flex-col gap-3 px-5 py-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {isEditing ? "Editing" : "Actions"}
                </p>

                {saveSuccess && (
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    Referral updated successfully.
                  </p>
                )}
                {patchMutation.isError && (
                  <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                    {formatError(patchMutation.error)}
                  </p>
                )}

                {isEditing ? (
                  <div className="flex flex-col gap-2 pt-1">
                    <Button
                      type="button"
                      className="w-full"
                      onClick={saveEditing}
                      disabled={patchMutation.isPending}
                    >
                      {patchMutation.isPending ? "Saving…" : "Save Changes"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={cancelEditing}
                      disabled={patchMutation.isPending}
                    >
                      <X className="size-4" />
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={startEditing}
                    >
                      <Pencil className="size-4" />
                      Edit Referral
                    </Button>
                  </div>
                )}

                {!isEditing && (
                  <div className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-3">
                    <InfoField label="Referral Code" value={formatFieldValue(referral.referralCode)} />
                    <InfoField label="Origin Facility" value={formatFieldValue(referral.originFacilityCode)} />
                    <InfoField
                      label="Raised By"
                      value={formatFieldValue(referral.raisedByUsername ?? referral.raisedBySub)}
                    />
                    <InfoField label="Created" value={formatDateTime(referral.createdAt)} />
                    <InfoField label="Last Updated" value={formatDateTime(referral.updatedAt)} />
                  </div>
                )}
              </CardContent>
            </Card>

            <ServiceRequestsSection
              organizationId={organizationId}
              currentOrgDbId={organizationQuery.data?.id}
              accessToken={session?.accessToken}
            />

            <HistoryTimeline
              referralCode={referralCode}
              accessToken={session?.accessToken}
            />
          </div>
        </div>
      )}
    </section>
  );
}

export default FacilityReferralDetailPage;
