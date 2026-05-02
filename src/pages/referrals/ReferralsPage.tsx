import { Link, Navigate } from "react-router-dom";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useOrganizationById } from "../../api/hooks/organizations/OrganizationById.hook";
import Breadcrumbs from "../../components/Breadcrumbs";
import ReferralPool from "../../components/ReferralPool";
import { useAuthContext } from "../../context/useAuthContext";
import { canAccessOrganization, isFacilityManager } from "../../utils/facilityAccess";

function ReferralsPage() {
  const { workspaceId: organizationId } = useWorkspace();
  const { session, isAuthenticated } = useAuthContext();
  const roles = session?.roles ?? [];
  const canManageReferrals = isFacilityManager(roles);

  const organizationQuery = useOrganizationById(organizationId, session?.accessToken, {
    enabled: canManageReferrals && organizationId.length > 0,
  });

  const hasFacilityAccess = canAccessOrganization(roles, session?.facilityId, organizationQuery.data);
  const facilityCode = organizationQuery.data?.facility_code?.trim() ?? "";

  if (!isAuthenticated) return <Navigate to="/signin" replace />;
  if (!canManageReferrals) return <Navigate to="/dashboard" replace />;
  if (!organizationId) return <Navigate to="/facilities" replace />;

  if (roles.includes("HOSPITAL_ADMIN") && !session?.facilityId) {
    return <Navigate to={`/${organizationId}/dashboard`} replace />;
  }

  if (organizationQuery.data && !canAccessOrganization(roles, session?.facilityId, organizationQuery.data)) {
    return <Navigate to={`/${organizationId}/dashboard`} replace />;
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
          <Link className="btn btn-primary org-btn referrals-page-btn" to={`/${organizationId}/referrals/create`}>
            Create Referral
          </Link>
          <Link className="btn btn-ghost org-btn referrals-page-btn" to={`/${organizationId}/referrals/facility`}>
            View Facility Referrals
          </Link>
        </div>
      </div>

      <Breadcrumbs
        items={[
          { label: facilityName, to: `/${organizationId}/organization` },
          { label: "Referrals" },
        ]}
      />

      {organizationQuery.isError ? (
        <article className="access-note error-block">
          <h2>Could not load facility</h2>
          <p>
            {organizationQuery.error instanceof Error
              ? organizationQuery.error.message
              : "Could not fetch facility details. Check your connection or sign in again."}
          </p>
        </article>
      ) : null}

      {organizationQuery.data && !facilityCode ? (
        <article className="access-note error-block">
          <h2>Missing facility code</h2>
          <p>This facility does not have a facility code, so referrals cannot be scoped correctly.</p>
        </article>
      ) : null}

      <ReferralPool
        organizationId={organizationId}
        facilityCode={facilityCode}
        hasFacilityAccess={hasFacilityAccess}
        accessToken={session?.accessToken}
        canManageReferrals={canManageReferrals}
      />
    </section>
  );
}

export default ReferralsPage;
