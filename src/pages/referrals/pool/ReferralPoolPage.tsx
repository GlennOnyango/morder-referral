import { Navigate } from "react-router-dom";
import { useWorkspace } from "../../../context/WorkspaceContext";
import Breadcrumbs from "../../../components/Breadcrumbs";
import ReferralPool from "../../../components/ReferralPool";
import { useAuthContext } from "../../../context/useAuthContext";
import { Card, CardContent } from "../../../components/ui/card";

function ReferralPoolPage() {
  const { workspaceId: organizationId } = useWorkspace();
  const { session, isAuthenticated, activeWorkspace } = useAuthContext();

  const org = activeWorkspace ?? undefined;
  const facilityName = org?.name ?? org?.facility_code ?? "Facility";

  if (!isAuthenticated) return <Navigate to="/signin" replace />;
  if (!organizationId) return <Navigate to="/facilities" replace />;

  return (
    <section className="org-shell reveal delay-1">
      <Card>
        <CardContent className="flex items-end justify-between gap-3 px-5 py-4">
          <div className="flex flex-col gap-1">
            <p className="eyebrow">Referrals</p>
            <h1 className="font-heading text-2xl font-semibold -tracking-[0.03em] text-slate-900 sm:text-3xl">Referral Pool</h1>
            <p className="text-sm text-slate-500">Browse all open referrals and take action.</p>
          </div>
        </CardContent>
      </Card>

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
