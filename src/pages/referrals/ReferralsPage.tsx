import { Link, Navigate } from "react-router-dom";
import { useWorkspace } from "../../context/WorkspaceContext";
import Breadcrumbs from "../../components/Breadcrumbs";
import { useAuthContext } from "../../context/useAuthContext";
import { isFacilityManager } from "../../utils/facilityAccess";

function ReferralsPage() {
  const { workspaceId: organizationId } = useWorkspace();
  const { session, isAuthenticated, activeWorkspace } = useAuthContext();
  const roles = session?.roles ?? [];
  const canManageReferrals = isFacilityManager(roles);

  const org = activeWorkspace ?? undefined;
  const facilityName = org?.name ?? org?.facility_code ?? "Facility";

  if (!isAuthenticated) return <Navigate to="/signin" replace />;
  if (!canManageReferrals) return <Navigate to={`/${organizationId}/dashboard`} replace />;
  if (!organizationId) return <Navigate to="/facilities" replace />;

  return (
    <section className="org-shell reveal delay-1">
      <div className="org-header">
        <div>
          <p className="eyebrow">Referrals</p>
          <h1>Referrals: {org?.name ?? "Facility"}</h1>
          <p>Create and manage facility referrals.</p>
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
    </section>
  );
}

export default ReferralsPage;
