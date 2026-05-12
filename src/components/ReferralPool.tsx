import { Sparkles, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGetReferralPool } from "../api/hooks/referrals/ReferralPool.hook";
import { usePostSummarizeReferral } from "../api/hooks/referrals/SummarizeReferral.hook";
import type { ModelsReferral } from "../types/referrals.generated";
import ReferralSummarizeDialog from "./dialogs/ReferralSummarizeDialog";
import ReferralAiSearchDialog from "./dialogs/ReferralAiSearchDialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { formatError, formatDateTime } from "../utils/format";
import { PriorityBadge, StatusBadge } from "./ReferralBadges";

const DEFAULT_POOL_PAGE_SIZE = 10;

interface ReferralPoolProps {
  organizationId: string;
  facilityCode?: string;
  hasFacilityAccess: boolean;
  accessToken: string | undefined;
  canManageReferrals: boolean;
}

function ReferralPool({
  organizationId,
  hasFacilityAccess,
  accessToken,
  canManageReferrals,
}: ReferralPoolProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [poolSearchTerm, setPoolSearchTerm] = useState("");
  const [debouncedPoolSearchTerm, setDebouncedPoolSearchTerm] = useState("");
  const [isAiSearchDialogOpen, setIsAiSearchDialogOpen] = useState(false);
  const [aiSearchPrompt, setAiSearchPrompt] = useState("");
  const [isAiSearchSubmitting, setIsAiSearchSubmitting] = useState(false);
  const [poolPage, setPoolPage] = useState(0);
  const [summaryDialogReferral, setSummaryDialogReferral] = useState<ModelsReferral | null>(null);
  const [summaryDialogCollapsed, setSummaryDialogCollapsed] = useState(false);
  const [poolSummary, setPoolSummary] = useState("");
  const poolPageSize = DEFAULT_POOL_PAGE_SIZE;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedPoolSearchTerm(poolSearchTerm.trim());
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [poolSearchTerm]);

  const poolOffset = poolPage * poolPageSize;

  const poolReferralsQuery = useGetReferralPool(
    { query: debouncedPoolSearchTerm || undefined, limit: poolPageSize, offset: poolOffset },
    accessToken,
    { enabled: canManageReferrals && hasFacilityAccess && Boolean(accessToken) },
  );

  const poolReferrals = poolReferralsQuery?.data ?? [];
  const hasNextPoolPage = poolReferrals.length === poolPageSize;
  const isSearchSettling = poolSearchTerm.trim() !== debouncedPoolSearchTerm;

  const summarizeReferralMutation = usePostSummarizeReferral(accessToken, {
    onMutate: () => { setPoolSummary(""); },
  });

  const openSummaryDialog = (referral: ModelsReferral) => {
    const code = referral.referralCode?.trim() ?? "";
    if (!code) return;
    setSummaryDialogCollapsed(false);
    setSummaryDialogReferral(referral);
    summarizeReferralMutation.mutate({
      referralCode: code,
      onChunk: (chunk) => setPoolSummary((s) => `${s}${chunk}`),
    });
  };

  const closeSummaryDialog = () => {
    setSummaryDialogReferral(null);
    setSummaryDialogCollapsed(false);
    setPoolSummary("");
  };

  const openReferralDetail = (referralCode: string) => {
    navigate(`/${organizationId}/referral-pool/${encodeURIComponent(referralCode)}`);
  };

  const openAiSearchDialog = () => {
    setAiSearchPrompt(poolSearchTerm);
    setIsAiSearchDialogOpen(true);
  };

  const submitAiSearch = async () => {
    const normalizedQuery = aiSearchPrompt.trim();
    setPoolPage(0);
    setPoolSearchTerm(normalizedQuery);
    setDebouncedPoolSearchTerm(normalizedQuery);
    setIsAiSearchDialogOpen(false);
    setIsAiSearchSubmitting(true);
    try {
      await queryClient.invalidateQueries({
        queryKey: ["referral-pool", organizationId],
        refetchType: "active",
      });
    } finally {
      setIsAiSearchSubmitting(false);
    }
  };

  const clearSearch = () => {
    setPoolSearchTerm("");
    setDebouncedPoolSearchTerm("");
    setPoolPage(0);
  };

  return (
    <>
      <div className="flex flex-col gap-5">
        {/* Search toolbar */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex flex-1 items-center gap-2">
                <Input
                  id="pool-search-input"
                  aria-label="Search referrals"
                  value={poolSearchTerm}
                  onChange={(e) => {
                    setPoolPage(0);
                    setPoolSearchTerm(e.target.value);
                  }}
                  placeholder="Search by service, patient, or origin facility"
                />
                {poolSearchTerm.length > 0 && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    aria-label="Clear search"
                    className="absolute right-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={openAiSearchDialog}
                className="shrink-0 gap-2"
              >
                <Sparkles className="size-4" />
                Search with AI
              </Button>
            </div>

            {(isSearchSettling || isAiSearchSubmitting || poolReferralsQuery.isLoading) && (
              <p className="mt-2 text-xs text-slate-500">
                {isAiSearchSubmitting ? "Running AI search…" : isSearchSettling ? "Updating results…" : "Loading…"}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Active search indicator */}
        {debouncedPoolSearchTerm && !isSearchSettling && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>
              Showing results for <strong>&ldquo;{debouncedPoolSearchTerm}&rdquo;</strong>
            </span>
            <button
              type="button"
              onClick={clearSearch}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="size-3" /> Clear
            </button>
          </div>
        )}

        {/* Error state */}
        {poolReferralsQuery.isError && (
          isAxiosError(poolReferralsQuery.error) && poolReferralsQuery.error.response?.status === 401 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="font-semibold text-slate-800">Unauthorized</p>
                <p className="mt-1 text-sm text-slate-500">You do not have permission to access the referral pool.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-rose-600">{formatError(poolReferralsQuery.error)}</p>
              </CardContent>
            </Card>
          )
        )}

        {/* Referral cards grid */}
        {poolReferralsQuery.data && (
          poolReferrals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-slate-500">
                  {debouncedPoolSearchTerm
                    ? `No open referrals found for "${debouncedPoolSearchTerm}".`
                    : "No open referrals in the pool."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="min-h-50 max-h-[calc(100dvh-26rem)] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {poolReferrals.map((referral) => {
                const referralCode = referral.referralCode ?? "";
                const normalizedPriority = (referral.priority ?? "").toLowerCase();
                const isEmergency = normalizedPriority === "emergency";
                const isUrgent = normalizedPriority === "urgent";

                return (
                  <Card
                    key={referral.id ?? referralCode}
                    className={
                      isEmergency
                        ? "border-l-4 border-l-rose-500"
                        : isUrgent
                          ? "border-l-4 border-l-amber-400"
                          : ""
                    }
                  >
                    <CardContent className="flex flex-col gap-3 p-4">
                      {/* Card header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Referral</p>
                          <p className="font-semibold text-slate-900">{referralCode || "—"}</p>
                        </div>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <PriorityBadge priority={referral.priority} />
                          <StatusBadge status={referral.status} />
                        </div>
                      </div>

                      {/* Meta grid */}
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <div>
                          <dt className="text-[0.7rem] font-medium uppercase tracking-wide text-slate-400">Service</dt>
                          <dd className="text-sm font-medium text-slate-800">{referral.serviceType ?? "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-[0.7rem] font-medium uppercase tracking-wide text-slate-400">Origin</dt>
                          <dd className="text-sm font-medium text-slate-800">{referral.originFacilityCode ?? "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-[0.7rem] font-medium uppercase tracking-wide text-slate-400">Patient</dt>
                          <dd className="text-sm font-medium text-slate-800">{referral.patient?.fullName ?? "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-[0.7rem] font-medium uppercase tracking-wide text-slate-400">Updated</dt>
                          <dd className="text-sm font-medium text-slate-800">{formatDateTime(referral.updatedAt)}</dd>
                        </div>
                      </dl>

                      {/* Actions */}
                      <div className="flex gap-2 border-t border-slate-100 pt-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="flex-1 gap-1.5"
                          onClick={() => openSummaryDialog(referral)}
                          disabled={!referralCode || summarizeReferralMutation.isPending}
                        >
                          <Sparkles className="size-3.5" />
                          {summarizeReferralMutation.isPending ? "Summarizing…" : "Summarize"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="flex-1"
                          onClick={() => { if (referralCode) openReferralDetail(referralCode); }}
                          disabled={!referralCode}
                        >
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              </div>
            </div>
          )
        )}

        {/* Pagination */}
        {poolReferralsQuery.data && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Page <strong>{poolPage + 1}</strong>
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPoolPage((p) => Math.max(p - 1, 0))}
                disabled={poolPage === 0 || poolReferralsQuery.isLoading}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPoolPage((p) => p + 1)}
                disabled={!hasNextPoolPage || poolReferralsQuery.isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <ReferralSummarizeDialog
        referral={summaryDialogReferral}
        summary={poolSummary}
        isCollapsed={summaryDialogCollapsed}
        isPending={summarizeReferralMutation.isPending}
        isError={summarizeReferralMutation.isError}
        error={summarizeReferralMutation.error}
        onCollapsedChange={setSummaryDialogCollapsed}
        onClose={closeSummaryDialog}
        onOpenDetail={openReferralDetail}
        onRegenerate={() => {
          const code = summaryDialogReferral?.referralCode?.trim() ?? "";
          if (code) {
            summarizeReferralMutation.mutate({
              referralCode: code,
              onChunk: (chunk) => setPoolSummary((s) => `${s}${chunk}`),
            });
          }
        }}
      />

      <ReferralAiSearchDialog
        open={isAiSearchDialogOpen}
        onOpenChange={(open) => { if (!open) setIsAiSearchDialogOpen(false); }}
        prompt={aiSearchPrompt}
        onPromptChange={setAiSearchPrompt}
        onSubmit={() => { void submitAiSearch(); }}
        isSubmitting={isAiSearchSubmitting}
      />
    </>
  );
}

export default ReferralPool;
