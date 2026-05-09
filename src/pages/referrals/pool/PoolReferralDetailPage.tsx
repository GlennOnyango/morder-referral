import { Sparkles } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useWorkspace } from "../../../context/WorkspaceContext";
import { validateOrganizationFacilityCode } from "../../../api/organizations";
import { useGetOrganizationById } from "../../../api/hooks/organizations/OrganizationById.hook";
import { useGetReferralByCode } from "../../../api/hooks/referrals/ReferralByCode.hook";
import { usePostAcceptReferral } from "../../../api/hooks/referrals/AcceptReferral.hook";
import { usePostReferralInfoRequest } from "../../../api/hooks/referrals/CreateReferralInfoRequest.hook";
import { usePostSummarizeReferral } from "../../../api/hooks/referrals/SummarizeReferral.hook";
import Breadcrumbs from "../../../components/Breadcrumbs";
import { PriorityBadge, StatusBadge } from "../../../components/ReferralBadges";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { useAuthContext } from "../../../context/useAuthContext";
import { ModelsReferralStatus } from "../../../types/referrals.generated";
import { canAccessOrganization, isFacilityManager } from "../../../utils/facilityAccess";
import {
  formatError,
  formatDateTime,
  formatFieldValue,
  formatDateOfBirthEpoch,
  safeDecode,
} from "../../../utils/format";

function normalizeCode(value?: string): string {
  return value?.trim().toLowerCase() ?? "";
}

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

function PoolReferralDetailPage() {
  const { referralCode: referralCodeParam } = useParams<{ referralCode: string }>();
  const { workspaceId: organizationId } = useWorkspace();
  const referralCode = safeDecode((referralCodeParam ?? "").trim());
  const { session, isAuthenticated } = useAuthContext();
  const roles = session?.roles ?? [];
  const canManageReferrals = isFacilityManager(roles);
  const queryClient = useQueryClient();

  const [acceptSuccessMessage, setAcceptSuccessMessage] = useState<string | null>(null);
  const [isRequestInfoDialogOpen, setIsRequestInfoDialogOpen] = useState(false);
  const [requestInfoTitle, setRequestInfoTitle] = useState("");
  const [requestInfoDescription, setRequestInfoDescription] = useState("");
  const [requestInfoSuccessMessage, setRequestInfoSuccessMessage] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState("");
  const [aiSummaryRequested, setAiSummaryRequested] = useState(false);

  const organizationQuery = useGetOrganizationById(organizationId, session?.accessToken, {
    enabled: canManageReferrals && organizationId.length > 0,
  });

  const hasFacilityAccess = canAccessOrganization(roles, session?.facilityId, organizationQuery.data);
  const facilityCode = organizationQuery.data?.facility_code?.trim() ?? "";

  const referralDetailQuery = useGetReferralByCode(referralCode, session?.accessToken, {
    enabled: canManageReferrals && referralCode.length > 0 && hasFacilityAccess,
  });

  const acceptReferralMutation = usePostAcceptReferral(session?.accessToken, {
    onSuccess: async (acceptedReferral) => {
      setAcceptSuccessMessage(
        acceptedReferral.referralCode
          ? `Referral ${acceptedReferral.referralCode} accepted successfully.`
          : "Referral accepted successfully.",
      );
      await queryClient.invalidateQueries({ queryKey: ["referrals", "pool"] });
      await queryClient.invalidateQueries({ queryKey: ["referrals", "facility"] });
      await queryClient.invalidateQueries({ queryKey: ["referrals", "detail", referralCode] });
    },
  });

  const requestInfoMutation = usePostReferralInfoRequest(session?.accessToken, {
    onSuccess: async () => {
      setIsRequestInfoDialogOpen(false);
      setRequestInfoSuccessMessage(`Additional information request sent for referral ${referralCode}.`);
      await queryClient.invalidateQueries({ queryKey: ["referrals", "detail", referralCode] });
    },
  });

  const summarizeCaseMutation = usePostSummarizeReferral(session?.accessToken, {
    onMutate: () => {
      setAiSummaryRequested(true);
      setAiSummary("");
    },
  });

  if (!isAuthenticated) return <Navigate to="/signin" replace />;
  if (!canManageReferrals) return <Navigate to="/dashboard" replace />;
  if (!organizationId) return <Navigate to="/facilities" replace />;
  if (!referralCode) return <Navigate to={`/${organizationId}/referral-pool`} replace />;
  if (roles.includes("HOSPITAL_ADMIN") && !session?.facilityId)
    return <Navigate to={`/${organizationId}/dashboard`} replace />;
  if (organizationQuery.data && !canAccessOrganization(roles, session?.facilityId, organizationQuery.data))
    return <Navigate to={`/${organizationId}/dashboard`} replace />;

  const facilityName =
    organizationQuery.data?.name ?? organizationQuery.data?.facility_code ?? "Facility";

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

  const handleRequestInfoSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!requestInfoTitle.trim() || !requestInfoDescription.trim()) return;
    const referralId = referralDetailQuery.data?.id?.trim() ?? "";
    if (!referralId) return;
    const originFacilityCode = referralDetailQuery.data?.originFacilityCode?.trim() ?? "";
    if (!originFacilityCode) return;
    validateOrganizationFacilityCode(originFacilityCode)
      .then((validation) => {
        const originFacilityId = validation.facilityId?.trim() ?? "";
        if (!validation.exists || !originFacilityId) return;
        requestInfoMutation.mutate({
          referralId,
          payload: {
            facilityId: originFacilityId,
            title: requestInfoTitle.trim(),
            additionalInformation: requestInfoDescription.trim(),
          },
        });
      })
      .catch(() => {});
  };

  const handleGenerateSummary = () => {
    setAcceptSuccessMessage(null);
    setRequestInfoSuccessMessage(null);
    summarizeCaseMutation.mutate({
      referralCode,
      onChunk: (chunk) => setAiSummary((s) => `${s}${chunk}`),
    });
  };

  return (
    <section className="org-shell reveal delay-1">
      {/* Page header */}
      <Card>
        <CardContent className="flex items-start justify-between gap-3 px-5 py-4">
          <div className="flex flex-col gap-1">
            <p className="eyebrow">Referral Pool</p>
            <h1 className="font-heading text-2xl font-semibold -tracking-[0.03em] text-slate-900 sm:text-3xl">
              {referralCode || "Referral Detail"}
            </h1>
            <p className="text-sm text-slate-500">Review all details before taking action on this referral.</p>
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
          { label: "Referral Pool", to: `/${organizationId}/referral-pool` },
          { label: referralCode },
        ]}
      />

      {organizationQuery.isError && (
        <article className="access-note error-block">
          <h2>Could not load facility</h2>
          <p>{formatError(organizationQuery.error)}</p>
        </article>
      )}
      {organizationQuery.data && !facilityCode && (
        <article className="access-note error-block">
          <h2>Missing facility code</h2>
          <p>This facility does not have a facility code — referral acceptance is unavailable.</p>
        </article>
      )}

      {referralDetailQuery.isLoading && (
        <article className="access-note">
          <h2>Loading referral</h2>
          <p>Fetching referral details…</p>
        </article>
      )}
      {referralDetailQuery.isError && (
        <article className="access-note error-block">
          <h2>Could not load referral</h2>
          <p>{formatError(referralDetailQuery.error)}</p>
        </article>
      )}

      {referral && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* ── Left column: detail cards ── */}
          <div className="flex flex-col gap-4 lg:col-span-2">
            <Card>
              <CardContent className="flex flex-col gap-4 px-5 py-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Referral Information
                </p>
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
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col gap-4 px-5 py-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Clinical Details
                </p>
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
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col gap-4 px-5 py-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Patient Details
                </p>
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
              </CardContent>
            </Card>
          </div>

          {/* ── Right column: actions + AI ── */}
          <div className="flex flex-col gap-4">
            <Card>
              <CardContent className="flex flex-col gap-3 px-5 py-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Actions</p>

                {isSameFacilityReferral && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    This referral originates from your facility and cannot be accepted.
                  </p>
                )}
                {!isSameFacilityReferral &&
                  referral.status !== ModelsReferralStatus.ReferralStatusOpen && (
                    <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      This referral is{" "}
                      <strong>{referral.status ?? "unavailable"}</strong> and cannot be accepted.
                    </p>
                  )}

                {acceptSuccessMessage && (
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    {acceptSuccessMessage}
                  </p>
                )}
                {requestInfoSuccessMessage && (
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    {requestInfoSuccessMessage}
                  </p>
                )}

                {acceptReferralMutation.isError && (
                  <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                    {formatError(acceptReferralMutation.error)}
                  </p>
                )}
                {requestInfoMutation.isError && (
                  <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                    {formatError(requestInfoMutation.error)}
                  </p>
                )}

                <div className="flex flex-col gap-2 pt-1">
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => {
                      setAcceptSuccessMessage(null);
                      setRequestInfoSuccessMessage(null);
                      acceptReferralMutation.mutate({ referralCode, payload: { facilityCode } });
                    }}
                    disabled={!canAcceptReferral || acceptReferralMutation.isPending}
                  >
                    {acceptReferralMutation.isPending ? "Accepting…" : "Accept Referral"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setAcceptSuccessMessage(null);
                      handleOpenRequestInfoDialog();
                    }}
                    disabled={!canRequestInformation}
                  >
                    Request More Information
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full gap-2"
                    onClick={handleGenerateSummary}
                    disabled={summarizeCaseMutation.isPending}
                  >
                    <Sparkles className="size-4" />
                    {summarizeCaseMutation.isPending ? "Summarising…" : "Generate AI Summary"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {aiSummaryRequested && (
              <Card>
                <CardContent className="flex flex-col gap-3 px-5 py-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">AI Summary</p>
                    {summarizeCaseMutation.isPending && (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700">
                        Generating
                      </span>
                    )}
                  </div>
                  {summarizeCaseMutation.isError && (
                    <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                      {formatError(summarizeCaseMutation.error)}
                    </p>
                  )}
                  {aiSummary ? (
                    <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{aiSummary}</p>
                  ) : summarizeCaseMutation.isPending ? (
                    <p className="text-sm italic text-slate-400">Preparing a concise clinical summary…</p>
                  ) : (
                    <p className="text-sm italic text-slate-400">No summary was returned. Try again.</p>
                  )}
                  {!summarizeCaseMutation.isPending && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="self-start gap-1.5"
                      onClick={handleGenerateSummary}
                    >
                      <Sparkles className="size-3.5" />
                      Regenerate
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      <Dialog
        open={isRequestInfoDialogOpen}
        onOpenChange={(open) => {
          if (!open) setIsRequestInfoDialogOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <p className="eyebrow">Referral {referralCode}</p>
            <DialogTitle>Request More Information</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Describe the information you need from the originating facility.
          </p>
          <form className="flex flex-col gap-4" onSubmit={handleRequestInfoSubmit}>
            <label
              className="flex flex-col gap-1.5 text-sm font-medium text-slate-700"
              htmlFor="request-info-title"
            >
              Title
              <Input
                id="request-info-title"
                value={requestInfoTitle}
                onChange={(e) => setRequestInfoTitle(e.target.value)}
                placeholder="e.g. Missing lab results"
                required
              />
            </label>
            <label
              className="flex flex-col gap-1.5 text-sm font-medium text-slate-700"
              htmlFor="request-info-description"
            >
              Description
              <textarea
                id="request-info-description"
                className="w-full resize-none rounded-xl border border-teal-900/19 bg-white/95 px-3.5 py-2.5 font-[inherit] text-[0.95rem] text-[#0d2230] placeholder:text-[#506071]/60 focus:border-emerald-700/70 focus:outline-none focus:shadow-[0_0_0_3px_rgba(17,122,101,0.13)]"
                rows={4}
                value={requestInfoDescription}
                onChange={(e) => setRequestInfoDescription(e.target.value)}
                placeholder="Describe the additional details or documents required."
                required
              />
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRequestInfoDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={requestInfoMutation.isPending}>
                {requestInfoMutation.isPending ? "Sending…" : "Send Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default PoolReferralDetailPage;
