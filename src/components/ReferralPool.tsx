import { Button } from "./ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useReferralPool } from "../api/hooks/referrals/ReferralPool.hook";
import { useSummarizeReferral } from "../api/hooks/referrals/SummarizeReferral.hook";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import type { ModelsReferral } from "../types/referrals.generated";

const DEFAULT_POOL_PAGE_SIZE = 10;

function formatError(error: unknown): string {
  if (isAxiosError(error)) {
    const payload = error.response?.data;
    if (payload && typeof payload === "object" && "message" in payload) {
      const value = (payload as { message?: unknown }).message;
      if (typeof value === "string") return value;
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Request failed. Please try again.";
}

function formatDateTime(value?: string): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

interface ReferralPoolProps {
  organizationId: string;
  facilityCode: string;
  hasFacilityAccess: boolean;
  accessToken: string | undefined;
  canManageReferrals: boolean;
}

function ReferralPool({
  organizationId,
  facilityCode,
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

  const poolReferralsQuery = useReferralPool(
    { query: debouncedPoolSearchTerm || undefined, limit: poolPageSize, offset: poolOffset },
    accessToken,
    { enabled: canManageReferrals && facilityCode.length > 0 && hasFacilityAccess && Boolean(accessToken) },
  );

  const poolReferrals = poolReferralsQuery?.data ?? [];

  const hasNextPoolPage = poolReferrals.length === poolPageSize;
  const isSearchSettling = poolSearchTerm.trim() !== debouncedPoolSearchTerm;

  const summarizeReferralMutation = useSummarizeReferral(accessToken, {
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
    navigate(`/${organizationId}/referrals/pool/${encodeURIComponent(referralCode)}`);
  };

  const openAiSearchDialog = () => {
    setAiSearchPrompt(poolSearchTerm);
    setIsAiSearchDialogOpen(true);
  };

  const closeAiSearchDialog = () => {
    setIsAiSearchDialogOpen(false);
  };

  const submitAiSearch = async () => {
    const normalizedQuery = aiSearchPrompt.trim();
    setPoolPage(0);
    setPoolSearchTerm(normalizedQuery);
    setDebouncedPoolSearchTerm(normalizedQuery);
    closeAiSearchDialog();
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

  return (
    <>
      <article className="org-table-card">
        <h2 className="referrals-pool-title">Referral Pool</h2>
        <p className="org-section-note referrals-pool-subtext">
          Review referrals and open one to view full details and actions.
        </p>
        <div className="org-table-tools referrals-table-tools">
          <div className="referrals-search-control">
            <div className="referrals-search-bar">
              <input
                id="pool-search-input"
                className="field-input org-filter-select referrals-search-input"
                aria-label="Search referrals"
                value={poolSearchTerm}
                onChange={(event) => {
                  setPoolPage(0);
                  setPoolSearchTerm(event.target.value);
                }}
                placeholder="Search referrals by service, patient, or origin facility"
              />
              <Button
                type="button"
                className="btn btn-ghost org-btn referrals-clear-icon-btn"
                onClick={() => {
                  setPoolSearchTerm("");
                  setDebouncedPoolSearchTerm("");
                  setPoolPage(0);
                }}
                disabled={poolSearchTerm.length === 0 && debouncedPoolSearchTerm.length === 0}
                aria-label="Clear search"
                title="Clear search"
              >
                ×
              </Button>
            </div>
          </div>
        </div>

        {poolReferralsQuery.isLoading ? <p className="org-empty">Loading referral pool...</p> : null}
        {isAiSearchSubmitting ? <p className="org-section-note referrals-search-summary">Searching with AI...</p> : null}
        {isSearchSettling ? <p className="org-section-note referrals-search-summary">Updating search...</p> : null}

        {poolReferralsQuery.isError ? (
          isAxiosError(poolReferralsQuery.error) && poolReferralsQuery.error.response?.status === 401 ? (
            <article className="access-note error-block">
              <h2>Unauthorized</h2>
              <p>You do not have permission to access the referral pool.</p>
            </article>
          ) : (
            <p className="result-note error-note">{formatError(poolReferralsQuery.error)}</p>
          )
        ) : null}

        {poolReferralsQuery.data ? (
          poolReferrals.length === 0 ? (
            <p className="org-empty">
              {debouncedPoolSearchTerm
                ? `No open referrals found for "${debouncedPoolSearchTerm}".`
                : "No open referrals found in the pool."}
            </p>
          ) : (
            <div className="referral-pool-grid">
              {poolReferrals.map((referral) => {
                const referralCode = referral.referralCode ?? "";
                const normalizedPriority = (referral.priority ?? "").toLowerCase();
                const isUrgent = normalizedPriority === "urgent";
                const isEmergency = normalizedPriority === "emergency";

                return (
                  <article
                    key={referral.id ?? referralCode}
                    className={`referral-pool-card${isUrgent ? " urgent" : ""}${isEmergency ? " emergency" : ""}`}
                  >
                    <div className="referral-pool-card-header">
                      <strong>{referralCode || "Referral"}</strong>
                      <span>{referral.status ?? "-"}</span>
                    </div>

                    <dl className="referral-pool-card-meta">
                      <div>
                        <dt>Service Type</dt>
                        <dd>{referral.serviceType ?? "-"}</dd>
                      </div>
                      <div>
                        <dt>Priority</dt>
                        <dd>{referral.priority ?? "-"}</dd>
                      </div>
                      <div>
                        <dt>Origin Facility</dt>
                        <dd>{referral.originFacilityCode ?? "-"}</dd>
                      </div>
                      <div>
                        <dt>Patient</dt>
                        <dd>{referral.patient?.fullName ?? "-"}</dd>
                      </div>
                      <div>
                        <dt>Updated</dt>
                        <dd>{formatDateTime(referral.updatedAt)}</dd>
                      </div>
                    </dl>

                    <div className="referral-pool-card-actions">
                      <Button
                        type="button"
                        className="btn btn-ghost org-btn referral-pool-ai-btn"
                        onClick={() => openSummaryDialog(referral)}
                        disabled={!referralCode || summarizeReferralMutation.isPending}
                      >
                        <span className="referral-pool-ai-btn-content">
                          <span className="referral-pool-ai-btn-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                              <path
                                d="M12 2.5l1.9 5.2 5.6 1.9-5.6 1.9L12 16.7l-1.9-5.2-5.6-1.9 5.6-1.9L12 2.5Zm7.2 11.8.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9.9-2.4ZM6 15.6l.8 2.1 2.1.8-2.1.8L6 21.4l-.8-2.1-2.1-.8 2.1-.8.8-2.1Z"
                                fill="currentColor"
                              />
                            </svg>
                          </span>
                          <span>{summarizeReferralMutation.isPending ? "Summarizing..." : "Summarize with AI"}</span>
                        </span>
                      </Button>
                      <Button
                        type="button"
                        className="btn btn-ghost org-btn"
                        onClick={() => { if (referralCode) openReferralDetail(referralCode); }}
                        disabled={!referralCode}
                      >
                        View More
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )
        ) : null}

        <div className="referrals-pagination">
          <p className="org-section-note referrals-page-indicator">
            Page <strong>{poolPage + 1}</strong>
          </p>
          <div className="referrals-pagination-actions">
            <Button
              type="button"
              className="btn btn-ghost org-btn referrals-pagination-btn"
              onClick={() => setPoolPage((current) => Math.max(current - 1, 0))}
              disabled={poolPage === 0 || poolReferralsQuery.isLoading}
            >
              Previous
            </Button>
            <Button
              type="button"
              className="btn btn-ghost org-btn referrals-pagination-btn"
              onClick={() => setPoolPage((current) => current + 1)}
              disabled={!hasNextPoolPage || poolReferralsQuery.isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      </article>

      <Dialog open={!!summaryDialogReferral} onOpenChange={(open) => { if (!open) closeSummaryDialog(); }}>
        <DialogContent className="referral-summary-dialog sm:max-w-190" showCloseButton={false}>
          <div className="referral-summary-dialog-header">
            <div>
              <p className="eyebrow">AI Assistant</p>
              <DialogTitle>Referral Summary</DialogTitle>
            </div>
            <div className="referral-summary-dialog-controls">
              <Button
                type="button"
                className="btn btn-ghost org-btn"
                onClick={() => setSummaryDialogCollapsed((current) => !current)}
              >
                {summaryDialogCollapsed ? "Expand" : "Collapse"}
              </Button>
              <Button type="button" className="btn btn-ghost org-btn" onClick={closeSummaryDialog}>
                Close
              </Button>
            </div>
          </div>

          {!summaryDialogCollapsed ? (
            <div className="referral-summary-dialog-body">
              <dl className="referral-summary-snapshot">
                <div><dt>Referral</dt><dd>{summaryDialogReferral?.referralCode ?? "-"}</dd></div>
                <div><dt>Status</dt><dd>{summaryDialogReferral?.status ?? "-"}</dd></div>
                <div><dt>Service</dt><dd>{summaryDialogReferral?.serviceType ?? "-"}</dd></div>
                <div><dt>Priority</dt><dd>{summaryDialogReferral?.priority ?? "-"}</dd></div>
                <div><dt>Origin</dt><dd>{summaryDialogReferral?.originFacilityCode ?? "-"}</dd></div>
                <div><dt>Patient</dt><dd>{summaryDialogReferral?.patient?.fullName ?? "-"}</dd></div>
                <div><dt>Updated</dt><dd>{formatDateTime(summaryDialogReferral?.updatedAt)}</dd></div>
              </dl>

              <section className="referral-summary-output" aria-live="polite">
                <div className="referral-summary-output-head">
                  <p>AI Narrative</p>
                  {summarizeReferralMutation.isPending ? <span className="referral-ai-summary-chip">Generating</span> : null}
                </div>
                {summarizeReferralMutation.isError ? (
                  <p className="result-note error-note referral-ai-summary-note">{formatError(summarizeReferralMutation.error)}</p>
                ) : null}
                {poolSummary ? (
                  <p className="referral-ai-summary-content">{poolSummary}</p>
                ) : summarizeReferralMutation.isPending ? (
                  <p className="referral-ai-summary-placeholder">Generating a concise review from the referral details...</p>
                ) : (
                  <p className="referral-ai-summary-placeholder">No summary was returned. Try again in a moment.</p>
                )}
              </section>

              <DialogFooter className="mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    const code = summaryDialogReferral?.referralCode?.trim() ?? "";
                    if (code) summarizeReferralMutation.mutate({ referralCode: code, onChunk: (chunk) => setPoolSummary((s) => `${s}${chunk}`) });
                  }}
                  disabled={summarizeReferralMutation.isPending || !summaryDialogReferral?.referralCode}
                >
                  {summarizeReferralMutation.isPending ? "Regenerating..." : "Regenerate"}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    const code = summaryDialogReferral?.referralCode?.trim() ?? "";
                    if (code) { closeSummaryDialog(); openReferralDetail(code); }
                  }}
                  disabled={!summaryDialogReferral?.referralCode}
                >
                  Open Full Referral
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <p className="referral-summary-collapsed-note">
              Summary collapsed. Select <strong>Expand</strong> to continue reviewing this referral.
            </p>
          )}
        </DialogContent>
      </Dialog>

      <Button
        type="button"
        className="btn referral-ai-search-fab"
        aria-label="Open AI search"
        aria-haspopup="dialog"
        onClick={openAiSearchDialog}
      >
        <span className="referral-ai-search-fab-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" role="presentation" focusable="false">
            <path
              d="M12 2.5l1.9 5.2 5.6 1.9-5.6 1.9L12 16.7l-1.9-5.2-5.6-1.9 5.6-1.9L12 2.5Zm7.2 11.8.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9.9-2.4ZM6 15.6l.8 2.1 2.1.8-2.1.8L6 21.4l-.8-2.1-2.1-.8 2.1-.8.8-2.1Z"
              fill="currentColor"
            />
          </svg>
        </span>
        <span className="referral-ai-search-fab-copy">
          <span>Search with AI</span>
          <small>Natural language</small>
        </span>
      </Button>

      <Dialog open={isAiSearchDialogOpen} onOpenChange={(open) => { if (!open) closeAiSearchDialog(); }}>
        <DialogContent className="referral-ai-search-dialog sm:max-w-160">
          <DialogHeader>
            <p className="eyebrow">AI Search</p>
            <DialogTitle>Search Referrals with Natural Language</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Describe what you are looking for. We will pass your exact prompt to semantic search.
          </p>
          <form
            className="referral-ai-search-form"
            onSubmit={(event) => {
              event.preventDefault();
              void submitAiSearch();
            }}
          >
            <label className="field" htmlFor="referral-ai-search-input">
              <span>Your search prompt</span>
              <textarea
                id="referral-ai-search-input"
                className="field-input referral-ai-search-input"
                value={aiSearchPrompt}
                onChange={(event) => setAiSearchPrompt(event.target.value)}
                rows={4}
                placeholder="Example: urgent cardiology referrals for elderly patients from county referral hospitals"
                autoFocus
              />
            </label>
            <DialogFooter className="referral-ai-search-actions">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAiSearchPrompt("")}
                disabled={aiSearchPrompt.length === 0 || isAiSearchSubmitting}
              >
                Clear
              </Button>
              <Button type="button" variant="ghost" onClick={closeAiSearchDialog} disabled={isAiSearchSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isAiSearchSubmitting}>
                {isAiSearchSubmitting ? "Searching..." : "Search"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ReferralPool;
