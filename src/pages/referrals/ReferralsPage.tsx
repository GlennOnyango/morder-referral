import { Link, Navigate } from "react-router-dom";
import { Card, CardContent } from "../../components/ui/card";
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
      <Card>
        <CardContent className="flex items-end justify-between gap-3 px-5 py-4">
          <div className="flex flex-col gap-1">
            <p className="eyebrow">Referrals</p>
            <h1 className="font-heading text-2xl font-semibold -tracking-[0.03em] text-slate-900 sm:text-3xl">
              Referrals: {org?.name ?? "Facility"}
            </h1>
            <p className="text-sm text-slate-500">Create and manage facility referrals.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link className="btn btn-primary org-btn" to={`/${organizationId}/referrals/create`}>
              Create Referral
            </Link>
            <Link className="btn btn-ghost org-btn" to={`/${organizationId}/referrals/facility`}>
              View Facility Referrals
            </Link>
          </div>
        </CardContent>
      </Card>

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
