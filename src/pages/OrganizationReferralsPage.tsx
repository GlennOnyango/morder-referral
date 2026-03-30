import { useMutation, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { getOrganizationById } from "../api/organizations";
import { listReferralPool, streamReferralSummaryByCode } from "../api/referrals";
import Breadcrumbs from "../components/Breadcrumbs";
import DialogPortal from "../components/DialogPortal";
import { useAuthContext } from "../context/AuthContext";
import type { ModelsReferral } from "../types/referrals.generated";
import { canAccessOrganization, isFacilityManager } from "../utils/facilityAccess";

const DEFAULT_POOL_PAGE_SIZE = 10;

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

function OrganizationReferralsPage() {
  const { id } = useParams<{ id: string }>();
  const organizationId = id ?? "";
  const navigate = useNavigate();
  const { session, isAuthenticated } = useAuthContext();
  const role = session?.role;
  const canManageReferrals = isFacilityManager(role);

  const [poolSearchTerm, setPoolSearchTerm] = useState("");
  const [debouncedPoolSearchTerm, setDebouncedPoolSearchTerm] = useState("");
  const [poolPage, setPoolPage] = useState(0);
  const [summaryDialogReferral, setSummaryDialogReferral] = useState<ModelsReferral | null>(null);
  const [summaryDialogCollapsed, setSummaryDialogCollapsed] = useState(false);
  const [poolSummary, setPoolSummary] = useState("");
  const poolPageSize = DEFAULT_POOL_PAGE_SIZE;

  const organizationQuery = useQuery({
    queryKey: ["organizations", "detail", organizationId, session?.accessToken],
    queryFn: () => getOrganizationById(organizationId, session?.accessToken),
    enabled: canManageReferrals && organizationId.length > 0,
  });

  const hasFacilityAccess = canAccessOrganization(role, session?.facilityId, organizationQuery.data);
  const facilityCode = organizationQuery.data?.facility_code?.trim() ?? "";

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedPoolSearchTerm(poolSearchTerm.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [poolSearchTerm]);

  const poolOffset = poolPage * poolPageSize;

  const poolReferralsQuery = useQuery({
    queryKey: [
      "referral-pool",
      organizationId,
      debouncedPoolSearchTerm,
      poolPageSize,
      poolOffset,
      session?.accessToken,
    ],
    queryFn: () =>
      listReferralPool(
        {
          serviceType: debouncedPoolSearchTerm || undefined,
          limit: poolPageSize,
          offset: poolOffset,
        },
        session?.accessToken,
      ),
    enabled: canManageReferrals && facilityCode.length > 0 && hasFacilityAccess,
  });

  const poolReferrals = poolReferralsQuery.data ?? [];
  const hasNextPoolPage = poolReferrals.length === poolPageSize;
  const isSearchSettling = poolSearchTerm.trim() !== debouncedPoolSearchTerm;

  const summarizeReferralMutation = useMutation({
    mutationFn: (code: string) =>
      streamReferralSummaryByCode(
        code,
        (chunk) => {
          setPoolSummary((currentSummary) => `${currentSummary}${chunk}`);
        },
        session?.accessToken,
      ),
    onMutate: () => {
      setPoolSummary("");
    },
  });

  const openSummaryDialog = (referral: ModelsReferral) => {
    const code = referral.referralCode?.trim() ?? "";
    if (!code) {
      return;
    }

    setSummaryDialogCollapsed(false);
    setSummaryDialogReferral(referral);
    summarizeReferralMutation.mutate(code);
  };

  const closeSummaryDialog = () => {
    setSummaryDialogReferral(null);
    setSummaryDialogCollapsed(false);
    setPoolSummary("");
  };

  const openReferralDetail = (referralCode: string) => {
    navigate(`/facilities/${organizationId}/referrals/pool/${encodeURIComponent(referralCode)}`);
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

  return (
    <section className="org-shell reveal delay-1">
      <div className="org-header">
        <div>
          <p className="eyebrow">Referrals</p>
          <h1>
            Referrals: {organizationQuery.data?.name ?? (organizationQuery.isLoading ? "Loading..." : "Facility")}
          </h1>
          <p>Use the explicit referral workflow pages to create and manage facility referrals.</p>
        </div>
        <div className="org-actions referrals-page-actions">
          <Link className="btn btn-primary org-btn referrals-page-btn" to={`/facilities/${organizationId}/referrals/create`}>
            Create Referral
          </Link>
          <Link className="btn btn-ghost org-btn referrals-page-btn" to={`/facilities/${organizationId}/referrals/facility`}>
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
          { label: "Referrals" },
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
          <p>This facility does not have a facility code, so referrals cannot be scoped correctly.</p>
        </article>
      ) : null}

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
                aria-label="Search by service type"
                value={poolSearchTerm}
                onChange={(event) => {
                  setPoolPage(0);
                  setPoolSearchTerm(event.target.value);
                }}
                placeholder="Search by service type e.g radiology"
              />
              <button
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
              </button>
            </div>
          </div>
        </div>

        {poolReferralsQuery.isLoading ? <p className="org-empty">Loading referral pool...</p> : null}
        {isSearchSettling ? <p className="org-section-note referrals-search-summary">Updating search...</p> : null}

        {poolReferralsQuery.isError ? (
          <p className="result-note error-note">{formatError(poolReferralsQuery.error)}</p>
        ) : null}

        {poolReferralsQuery.data ? (
          poolReferrals.length === 0 ? (
            <p className="org-empty">
              {debouncedPoolSearchTerm
                ? `No open referrals found for service type "${debouncedPoolSearchTerm}".`
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
                      <button
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
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost org-btn"
                        onClick={() => {
                          if (referralCode) {
                            openReferralDetail(referralCode);
                          }
                        }}
                        disabled={!referralCode}
                      >
                        View More
                      </button>
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
            <button
              type="button"
              className="btn btn-ghost org-btn referrals-pagination-btn"
              onClick={() => setPoolPage((current) => Math.max(current - 1, 0))}
              disabled={poolPage === 0 || poolReferralsQuery.isLoading}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn-ghost org-btn referrals-pagination-btn"
              onClick={() => setPoolPage((current) => current + 1)}
              disabled={!hasNextPoolPage || poolReferralsQuery.isLoading}
            >
              Next
            </button>
          </div>
        </div>
      </article>

      {summaryDialogReferral ? (
        <DialogPortal>
          <div className="dialog-backdrop" role="presentation" onClick={closeSummaryDialog}>
            <article
              className="dialog-card referral-summary-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="referral-summary-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="referral-summary-dialog-header">
                <div>
                  <p className="eyebrow">AI Assistant</p>
                  <h2 id="referral-summary-title">Referral Summary</h2>
                </div>
                <div className="referral-summary-dialog-controls">
                  <button
                    type="button"
                    className="btn btn-ghost org-btn"
                    onClick={() => setSummaryDialogCollapsed((current) => !current)}
                  >
                    {summaryDialogCollapsed ? "Expand" : "Collapse"}
                  </button>
                  <button type="button" className="btn btn-ghost org-btn" onClick={closeSummaryDialog}>
                    Close
                  </button>
                </div>
              </div>

              {!summaryDialogCollapsed ? (
                <div className="referral-summary-dialog-body">
                  <dl className="referral-summary-snapshot">
                    <div>
                      <dt>Referral</dt>
                      <dd>{summaryDialogReferral.referralCode ?? "-"}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{summaryDialogReferral.status ?? "-"}</dd>
                    </div>
                    <div>
                      <dt>Service</dt>
                      <dd>{summaryDialogReferral.serviceType ?? "-"}</dd>
                    </div>
                    <div>
                      <dt>Priority</dt>
                      <dd>{summaryDialogReferral.priority ?? "-"}</dd>
                    </div>
                    <div>
                      <dt>Origin</dt>
                      <dd>{summaryDialogReferral.originFacilityCode ?? "-"}</dd>
                    </div>
                    <div>
                      <dt>Patient</dt>
                      <dd>{summaryDialogReferral.patient?.fullName ?? "-"}</dd>
                    </div>
                    <div>
                      <dt>Updated</dt>
                      <dd>{formatDateTime(summaryDialogReferral.updatedAt)}</dd>
                    </div>
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

                  <div className="dialog-actions">
                    <button
                      type="button"
                      className="btn btn-ghost org-btn"
                      onClick={() => {
                        const code = summaryDialogReferral.referralCode?.trim() ?? "";
                        if (code) {
                          summarizeReferralMutation.mutate(code);
                        }
                      }}
                      disabled={summarizeReferralMutation.isPending || !summaryDialogReferral.referralCode}
                    >
                      {summarizeReferralMutation.isPending ? "Regenerating..." : "Regenerate"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary org-btn"
                      onClick={() => {
                        const code = summaryDialogReferral.referralCode?.trim() ?? "";
                        if (code) {
                          closeSummaryDialog();
                          openReferralDetail(code);
                        }
                      }}
                      disabled={!summaryDialogReferral.referralCode}
                    >
                      Open Full Referral
                    </button>
                  </div>
                </div>
              ) : (
                <p className="referral-summary-collapsed-note">
                  Summary collapsed. Select <strong>Expand</strong> to continue reviewing this referral.
                </p>
              )}
            </article>
          </div>
        </DialogPortal>
      ) : null}
    </section>
  );
}

export default OrganizationReferralsPage;
