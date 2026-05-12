import { Pencil, X, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useWorkspace } from "../../../context/WorkspaceContext";
import { useGetOrganizationById } from "../../../api/hooks/organizations/OrganizationById.hook";
import { useGetReferralByCode } from "../../../api/hooks/referrals/ReferralByCode.hook";
import { useGetReferralHistory } from "../../../api/hooks/referrals/ReferralHistory.hook";
import { usePatchReferral } from "../../../api/hooks/referrals/PatchReferral.hook";
import Breadcrumbs from "../../../components/Breadcrumbs";
import { PriorityBadge, StatusBadge } from "../../../components/ReferralBadges";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { useAuthContext } from "../../../context/useAuthContext";
import type { ModelsReferral } from "../../../types/referrals.generated";
import { canAccessOrganization, isFacilityManager } from "../../../utils/facilityAccess";
import {
  formatError,
  formatDateTime,
  formatFieldValue,
  formatDateOfBirthEpoch,
  safeDecode,
} from "../../../utils/format";
import type { ReferralUpdateInput } from "../../../api/referrals";

// ── Read-only display helpers ────────────────────────────────────────────────

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="text-sm font-medium text-slate-800 wrap-break-word">{value || "—"}</dd>
    </div>
  );
}

function InfoFieldLong({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap wrap-break-word">{value || "—"}</dd>
    </div>
  );
}

// ── Edit form state ──────────────────────────────────────────────────────────

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
    Number.isInteger(dobNum) && dobNum >= 1900 && dobNum <= new Date().getFullYear() ? dobNum : undefined;
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

// ── Labelled edit field components ──────────────────────────────────────────

function EditField({
  label,
  id,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400" htmlFor={id}>
      {label}
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="normal-case text-[0.9rem] tracking-normal"
      />
    </label>
  );
}

function EditTextarea({
  label,
  id,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400" htmlFor={id}>
      {label}
      <textarea
        id={id}
        className="w-full resize-none rounded-xl border border-teal-900/19 bg-white/95 px-3.5 py-2.5 font-[inherit] normal-case text-[0.9rem] tracking-normal text-[#0d2230] placeholder:text-[#506071]/60 focus:border-emerald-700/70 focus:outline-none focus:shadow-[0_0_0_3px_rgba(17,122,101,0.13)]"
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

// ── History timeline ─────────────────────────────────────────────────────────

function HistoryTimeline({ referralCode, accessToken }: { referralCode: string; accessToken?: string }) {
  const [expanded, setExpanded] = useState(false);
  const historyQuery = useGetReferralHistory(referralCode, accessToken, {
    enabled: expanded && referralCode.length > 0,
  });

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 px-5 py-5">
        <button
          type="button"
          className="flex items-center justify-between gap-2 w-full"
          onClick={() => setExpanded((p) => !p)}
        >
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-slate-400" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Audit History
            </p>
          </div>
          {expanded ? (
            <ChevronUp className="size-4 text-slate-400" />
          ) : (
            <ChevronDown className="size-4 text-slate-400" />
          )}
        </button>

        {expanded && (
          <div className="flex flex-col gap-0 mt-1">
            {historyQuery.isLoading && (
              <p className="text-sm text-slate-400 italic py-2">Loading history…</p>
            )}
            {historyQuery.isError && (
              <p className="text-xs text-rose-600">{formatError(historyQuery.error)}</p>
            )}
            {historyQuery.data?.length === 0 && (
              <p className="text-sm text-slate-400 italic">No history events recorded.</p>
            )}
            {historyQuery.data && historyQuery.data.length > 0 && (
              <ol className="relative border-l border-slate-200 ml-2 flex flex-col gap-0">
                {historyQuery.data.map((entry, i) => (
                  <li
                    key={entry.id ?? `${entry.action ?? "event"}-${i}`}
                    className="ml-4 pb-5 last:pb-0"
                  >
                    <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full border-2 border-white bg-slate-300" />
                    <p className="text-xs font-semibold text-slate-700">
                      {entry.action ?? "Event"}
                    </p>
                    {entry.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{entry.description}</p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {entry.actorName ?? entry.actorSub ?? "System"} &middot;{" "}
                      {formatDateTime(entry.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

function FacilityReferralDetailPage() {
  const { referralCode: referralCodeParam } = useParams<{ referralCode: string }>();
  const { workspaceId: organizationId } = useWorkspace();
  const referralCode = safeDecode((referralCodeParam ?? "").trim());
  const { session, isAuthenticated, workspaceRoles } = useAuthContext();
  const roles = workspaceRoles;
  const canManageReferrals = isFacilityManager(roles);
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const organizationQuery = useGetOrganizationById(organizationId, session?.accessToken, {
    enabled: canManageReferrals && organizationId.length > 0,
  });

  const hasFacilityAccess = canAccessOrganization(roles, session?.facilityId, organizationQuery.data);

  const referralQuery = useGetReferralByCode(referralCode, session?.accessToken, {
    enabled: canManageReferrals && referralCode.length > 0 && hasFacilityAccess,
  });

  const patchMutation = usePatchReferral(session?.accessToken, {
    onSuccess: async () => {
      setSaveSuccess(true);
      setIsEditing(false);
      await queryClient.invalidateQueries({ queryKey: ["referrals", "detail", referralCode] });
      await queryClient.invalidateQueries({ queryKey: ["referrals", "facility"] });
    },
  });

  if (!isAuthenticated) return <Navigate to="/signin" replace />;
  if (!canManageReferrals) return <Navigate to="/dashboard" replace />;
  if (!organizationId) return <Navigate to="/facilities" replace />;
  if (!referralCode) return <Navigate to={`/${organizationId}/referrals/facility`} replace />;
  if (roles.includes("HOSPITAL_ADMIN") && !session?.facilityId)
    return <Navigate to={`/${organizationId}/dashboard`} replace />;
  if (organizationQuery.data && !canAccessOrganization(roles, session?.facilityId, organizationQuery.data))
    return <Navigate to={`/${organizationId}/dashboard`} replace />;

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
      {/* Header */}
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

      {/* Loading / error states */}
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
          {/* ── Left: detail cards ── */}
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

          {/* ── Right: actions + history ── */}
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

                {/* Immutable metadata */}
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
