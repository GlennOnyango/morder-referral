import { Button } from "../../components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { getOrganizationById } from "../../api/organizations";
import { getReferralByCode, getReferralHistoryByCode, listFacilityReferrals } from "../../api/referrals";
import Breadcrumbs from "../../components/Breadcrumbs";
import { useAuthContext } from "../../context/AuthContext";
import { ModelsReferralStatus } from "../../types/referrals.generated";
import { canAccessOrganization, isFacilityManager } from "../../utils/facilityAccess";

type FacilityStatusFilter = "all" | ModelsReferralStatus;
// type FacilityRoleFilter = "all" | "origin" | "accepted";

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

function OrganizationFacilityReferralsPage() {
  const { id } = useParams<{ id: string }>();
  const organizationId = id ?? "";
  const { session, isAuthenticated } = useAuthContext();
  const role = session?.role;
  const canManageReferrals = isFacilityManager(role);

  const [facilityStatusFilter, setFacilityStatusFilter] = useState<FacilityStatusFilter>("all");
  // const [facilityRoleFilter, setFacilityRoleFilter] = useState<FacilityRoleFilter>("all");
  const [selectedReferralCode, setSelectedReferralCode] = useState("");

  const organizationQuery = useQuery({
    queryKey: ["organizations", "detail", organizationId, session?.accessToken],
    queryFn: () => getOrganizationById(organizationId, session?.accessToken),
    enabled: canManageReferrals && organizationId.length > 0,
  });

  const hasFacilityAccess = canAccessOrganization(role, session?.facilityId, organizationQuery.data);
  const facilityCode = organizationQuery.data?.facility_code?.trim() ?? "";

  const facilityReferralsQuery = useQuery({
    queryKey: [
      "facility-referrals",
      organizationId,
      facilityCode,
      facilityStatusFilter,
      // facilityRoleFilter,
      session?.accessToken,
    ],
    queryFn: () =>
      listFacilityReferrals(
        facilityCode,
        {
          status: facilityStatusFilter === "all" ? undefined : facilityStatusFilter,
          // role: facilityRoleFilter === "all" ? undefined : facilityRoleFilter,
        },
        session?.accessToken,
      ),
    enabled: canManageReferrals && facilityCode.length > 0 && hasFacilityAccess,
  });

  const referralDetailQuery = useQuery({
    queryKey: ["referral-detail", selectedReferralCode, session?.accessToken],
    queryFn: () => getReferralByCode(selectedReferralCode, session?.accessToken),
    enabled: canManageReferrals && selectedReferralCode.length > 0 && hasFacilityAccess,
  });

  const referralHistoryQuery = useQuery({
    queryKey: ["referral-history", selectedReferralCode, session?.accessToken],
    queryFn: () => getReferralHistoryByCode(selectedReferralCode, session?.accessToken),
    enabled: canManageReferrals && selectedReferralCode.length > 0 && hasFacilityAccess,
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
          <h1>Facility Referrals</h1>
          <p>View referrals created by or accepted by this facility.</p>
        </div>
        <div className="org-actions">
          <Link className="btn btn-ghost org-btn" to={`/facilities/${organizationId}/referrals`}>
            Back to Referrals
          </Link>
          <Link className="btn btn-primary org-btn" to={`/facilities/${organizationId}/referrals/create`}>
            Create Referral
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
          { label: "Facility Referrals" },
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
          <p>This facility does not have a facility code, so facility referrals cannot be loaded.</p>
        </article>
      ) : null}

      <article className="org-table-card">
        <h2>Facility Referrals Table</h2>
        <div className="org-table-tools">
          <label className="org-filter-control" htmlFor="facility-referral-status">
            Status
            <select
              id="facility-referral-status"
              className="field-input org-filter-select"
              value={facilityStatusFilter}
              onChange={(event) => setFacilityStatusFilter(event.target.value as FacilityStatusFilter)}
            >
              <option value="all">all</option>
              <option value={ModelsReferralStatus.ReferralStatusOpen}>open</option>
              <option value={ModelsReferralStatus.ReferralStatusAccepted}>accepted</option>
              <option value={ModelsReferralStatus.ReferralStatusCancelled}>cancelled</option>
              <option value={ModelsReferralStatus.ReferralStatusClosed}>closed</option>
            </select>
          </label>
          {/* <label className="org-filter-control" htmlFor="facility-referral-role">
            Role
            <select
              id="facility-referral-role"
              className="field-input org-filter-select"
              value={facilityRoleFilter}
              onChange={(event) => setFacilityRoleFilter(event.target.value as FacilityRoleFilter)}
            >
              <option value="all">all</option>
              <option value="origin">origin</option>
              <option value="accepted">accepted</option>
            </select>
          </label> */}
        </div>

        {facilityReferralsQuery.isLoading ? <p className="org-empty">Loading facility referrals...</p> : null}
        {facilityReferralsQuery.isError ? (
          <p className="result-note error-note">{formatError(facilityReferralsQuery.error)}</p>
        ) : null}

        {facilityReferralsQuery.data ? (
          facilityReferralsQuery.data.length === 0 ? (
            <p className="org-empty">No referrals found for this facility filter.</p>
          ) : (
            <div className="org-table-wrap">
              <table className="org-table">
                <thead>
                  <tr>
                    <th>Referral Code</th>
                    <th>Status</th>
                    <th>Service Type</th>
                    <th>Priority</th>
                    <th>Origin Facility</th>
                    <th>Accepted Facility</th>
                    <th>Raised By</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {facilityReferralsQuery.data.map((referral) => {
                    const referralCode = referral.referralCode ?? "";
                    return (
                      <tr key={referral.id ?? referralCode}>
                        <td>{referralCode || "-"}</td>
                        <td>{referral.status ?? "-"}</td>
                        <td>{referral.serviceType ?? "-"}</td>
                        <td>{referral.priority ?? "-"}</td>
                        <td>{referral.originFacilityCode ?? "-"}</td>
                        <td>{referral.acceptedByFacilityCode ?? "-"}</td>
                        <td>{referral.raisedByUsername ?? referral.raisedBySub ?? "-"}</td>
                        <td>{formatDateTime(referral.updatedAt)}</td>
                        <td>
                          <div className="org-actions">
                            <Button
                              type="button"
                              className="btn btn-ghost org-btn"
                              disabled={!referralCode}
                              onClick={() => setSelectedReferralCode(referralCode)}
                            >
                              History
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </article>

      {selectedReferralCode ? (
        <article className="org-table-card">
          <h2>Referral Detail & History</h2>
          <p className="org-section-note">
            Referral code: <strong>{selectedReferralCode}</strong>
          </p>

          {referralDetailQuery.isLoading ? <p className="org-empty">Loading referral details...</p> : null}
          {referralDetailQuery.isError ? (
            <p className="result-note error-note">{formatError(referralDetailQuery.error)}</p>
          ) : null}

          {referralDetailQuery.data ? (
            <div className="org-grid">
              <p className="org-section-note">
                Status: <strong>{referralDetailQuery.data.status ?? "-"}</strong>
              </p>
              <p className="org-section-note">
                Service type: <strong>{referralDetailQuery.data.serviceType ?? "-"}</strong>
              </p>
              <p className="org-section-note">
                Priority: <strong>{referralDetailQuery.data.priority ?? "-"}</strong>
              </p>
              <p className="org-section-note">
                Raised by:{" "}
                <strong>{referralDetailQuery.data.raisedByUsername ?? referralDetailQuery.data.raisedBySub ?? "-"}</strong>
              </p>
              <p className="org-section-note">
                Origin facility: <strong>{referralDetailQuery.data.originFacilityCode ?? "-"}</strong>
              </p>
              <p className="org-section-note">
                Accepted facility: <strong>{referralDetailQuery.data.acceptedByFacilityCode ?? "-"}</strong>
              </p>
            </div>
          ) : null}

          {referralHistoryQuery.isLoading ? <p className="org-empty">Loading referral history...</p> : null}
          {referralHistoryQuery.isError ? (
            <p className="result-note error-note">{formatError(referralHistoryQuery.error)}</p>
          ) : null}

          {referralHistoryQuery.data ? (
            referralHistoryQuery.data.length === 0 ? (
              <p className="org-empty">No history events found for this referral.</p>
            ) : (
              <div className="org-table-wrap">
                <table className="org-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Actor</th>
                      <th>Facility</th>
                      <th>Description</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referralHistoryQuery.data.map((entry) => (
                      <tr key={entry.id ?? `${entry.action ?? "event"}-${entry.createdAt ?? ""}`}>
                        <td>{entry.action ?? "-"}</td>
                        <td>{entry.actorName ?? entry.actorSub ?? "-"}</td>
                        <td>{entry.facilityCode ?? "-"}</td>
                        <td>{entry.description ?? "-"}</td>
                        <td>{formatDateTime(entry.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : null}
        </article>
      ) : null}
    </section>
  );
}

export default OrganizationFacilityReferralsPage;
