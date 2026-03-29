import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { getOrganizationById } from "../api/organizations";
import { listReferralPool } from "../api/referrals";
import Breadcrumbs from "../components/Breadcrumbs";
import { useAuthContext } from "../context/AuthContext";
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
    </section>
  );
}

export default OrganizationReferralsPage;
