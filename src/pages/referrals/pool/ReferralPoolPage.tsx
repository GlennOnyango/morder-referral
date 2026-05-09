import { Navigate } from "react-router-dom";
import { useWorkspace } from "../../../context/WorkspaceContext";
import Breadcrumbs from "../../../components/Breadcrumbs";
import ReferralPool from "../../../components/ReferralPool";
import { useAuthContext } from "../../../context/useAuthContext";

function ReferralPoolPage() {
  const { workspaceId: organizationId } = useWorkspace();
  const { session, isAuthenticated, activeWorkspace } = useAuthContext();

  const org = activeWorkspace ?? undefined;
  const facilityName = org?.name ?? org?.facility_code ?? "Facility";

  if (!isAuthenticated) return <Navigate to="/signin" replace />;
  if (!organizationId) return <Navigate to="/facilities" replace />;

  return (
    <section className="org-shell reveal delay-1">
      <div className="org-header">
        <div>
          <p className="eyebrow">Referrals</p>
          <h1>Referral Pool</h1>
          <p>Browse all open referrals and take action.</p>
        </div>
      </div>

      <Breadcrumbs
        items={[
          { label: facilityName, to: `/${organizationId}/dashboard` },
          { label: "Referral Pool" },
        ]}
      />

      <ReferralPool
        organizationId={organizationId}
        hasFacilityAccess={true}
        accessToken={session?.accessToken}
        canManageReferrals={true}
      />
    </section>
  );
}

export default ReferralPoolPage;
