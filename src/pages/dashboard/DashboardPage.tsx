import { useMemo } from "react";
import { Navigate } from "react-router-dom";
import Breadcrumbs from "../../components/Breadcrumbs";
import { useAuthContext } from "../../context/useAuthContext";
import { isOrganizationOwnedBySessionFacility } from "../../utils/facilityAccess";
import SetupActionCards from "@/components/SetUpActionCards";
import StatCard from "@/components/StatCard";
import ReferralStats from "@/components/ReferralStats";
import SuperAdminStats from "@/components/SuperAdminStats";
import ServiceAdminStats from "@/components/ServiceAdminStats";
import { useOrganizations } from "../../api/hooks/organizations/Organizations.hook";
import { useFacilityReferrals } from "../../api/hooks/referrals/FacilityReferrals.hook";
import { useReferralPool } from "../../api/hooks/referrals/ReferralPool.hook";
import { useOrganizationServices } from "../../api/hooks/services/OrganizationServices.hook";
import { useDashboardMetrics } from "../../api/hooks/metrics/DashboardMetrics.hook";

function DashboardPage() {
  const { isAuthenticated, session } = useAuthContext();
  const roles = session?.roles ?? [];
  const isSuperAdmin = roles.includes("SUPER_ADMIN");
  const isHospitalAdmin = roles.includes("HOSPITAL_ADMIN");
  const isServiceAdmin = roles.includes("SERVICE_ADMIN");
  const hasFacility = Boolean(session?.facilityId);

  // Three states for access control
  const showSetupOnly = !hasFacility && roles.length === 0;
  const showRolePending = hasFacility && roles.length === 0;
  const showDashboard = roles.length > 0;

  // ── facility context (hospital admin) — keep inline useQuery for custom filter logic ──
  const orgsForFacilityQuery = useOrganizations(session?.accessToken, {
    enabled: isAuthenticated && isHospitalAdmin && Boolean(session?.facilityId),
  });

  const hospitalFacilityData = useMemo(
    () =>
      orgsForFacilityQuery.data?.find((o) =>
        isOrganizationOwnedBySessionFacility(o, session?.facilityId),
      ) ?? null,
    [orgsForFacilityQuery.data, session?.facilityId],
  );

  // Wrap as a query-like object so downstream references remain unchanged
  // const hospitalFacilityQuery = {
  //   data: hospitalFacilityData,
  //   isLoading: orgsForFacilityQuery.isLoading,
  //   isError: orgsForFacilityQuery.isError,
  // };

  // const facilityCode = hospitalFacilityData?.facility_code?.trim() ?? "";
  // const facilityId = hospitalFacilityData?.id?.trim() ?? "";

  // // ── origin referrals (hospital admin) ──
  // const originReferralsQuery = useFacilityReferrals(
  //   facilityCode,
  //   { role: "origin", limit: 1000, offset: 0 },
  //   session?.accessToken,
  //   { enabled: isAuthenticated && isHospitalAdmin && Boolean(facilityCode) },
  // );

  // // ── accepted referrals (hospital admin) ──
  // const acceptedReferralsQuery = useFacilityReferrals(
  //   facilityCode,
  //   { role: "accepted", limit: 1000, offset: 0 },
  //   session?.accessToken,
  //   { enabled: isAuthenticated && isHospitalAdmin && Boolean(facilityCode) },
  // );

  // // ── pool referrals (super admin) ──
  // const poolReferralsQuery = useReferralPool(
  //   { limit: 1000, offset: 0 },
  //   session?.accessToken,
  //   { enabled: isAuthenticated && isSuperAdmin },
  // );

  // ── services (service admin) ──
  const serviceAdminServicesQuery = useOrganizationServices(
    session?.facilityId ?? "",
    session?.accessToken,
    { enabled: isAuthenticated && isServiceAdmin && Boolean(session?.facilityId) },
  );

  // ── org/service metrics (super admin) ──
  const dashboardQuery = useDashboardMetrics(session?.accessToken, {
    enabled: isAuthenticated && isSuperAdmin,
  });

  if (!isAuthenticated) return <Navigate to="/signin" replace />;

  // const hospitalStatsLoading =
  //   isHospitalAdmin &&
  //   (hospitalFacilityQuery.isLoading ||
  //     originReferralsQuery.isLoading ||
  //     acceptedReferralsQuery.isLoading);

  // const hospitalStatsError =
  //   isHospitalAdmin &&
  //   Boolean(
  //     hospitalFacilityQuery.isError ||
  //     originReferralsQuery.isError ||
  //     acceptedReferralsQuery.isError,
  //   );

  return (
    <section className="dashboard-shell reveal delay-1">
      <div className="dashboard-heading">
        <p className="eyebrow">Dashboard</p>
        <h1>Referral Operations</h1>
        <p className="dashboard-meta">
          Track referral flow, status, and facility activity in one place.
        </p>
      </div>

      <Breadcrumbs
        items={[{ label: "Dashboard" }]}
      />

      {/* ── State 1: no facility, no role → setup cards ── */}
      {showSetupOnly && <SetupActionCards />}

      {/* ── State 2: has facility, no role → role pending ── */}
      {showRolePending && (
        <article className="access-note">
          <h2>Role pending</h2>
          <p>
            Wait for a SUPER_ADMIN to assign your role before accessing
            restricted modules.
          </p>
        </article>
      )}

      {/* ── State 3: has role → full dashboard ── */}
      {showDashboard && (
        <>
          {isHospitalAdmin && !session?.facilityId && (
            <article className="access-note error-block">
              <h2>Missing facility assignment</h2>
              <p>
                Could not resolve your facility_id from token claims. Sign in
                again or contact support.
              </p>
            </article>
          )}
{/* 
          {hospitalStatsLoading && (
            <article className="access-note">
              <h2>Loading dashboard</h2>
              <p>Fetching your facility's referral data…</p>
            </article>
          )}

          {hospitalStatsError && (
            <article className="access-note error-block">
              <h2>Could not load dashboard data</h2>
              <p>Check your connection or sign in again.</p>
              <button type="button" className="btn btn-outline" onClick={() => window.location.reload()}>
                Reload page
              </button>
            </article>
          )} */}

          {/* Hospital admin stats */}
          {/* {isHospitalAdmin &&
            !hospitalStatsLoading &&
            !hospitalStatsError &&
            facilityId && (
              <ReferralStats
                originReferrals={originReferralsQuery.data ?? []}
                acceptedReferrals={acceptedReferralsQuery.data ?? []}
                facilityId={facilityId}
              />
            )} */}

          {/* Service admin – missing facility warning */}
          {isServiceAdmin && !session?.facilityId && (
            <article className="access-note error-block">
              <h2>Missing facility assignment</h2>
              <p>
                Could not resolve your organisation from token claims. Sign in
                again or contact support.
              </p>
            </article>
          )}

          {/* Service admin – loading */}
          {isServiceAdmin && serviceAdminServicesQuery.isLoading && (
            <article className="access-note">
              <h2>Loading dashboard</h2>
              <p>Fetching your organisation's service data…</p>
            </article>
          )}

          {/* Service admin – error */}
          {isServiceAdmin && serviceAdminServicesQuery.isError && (
            <article className="access-note error-block">
              <h2>Could not load service data</h2>
              <p>
                {serviceAdminServicesQuery.error instanceof Error
                  ? serviceAdminServicesQuery.error.message
                  : "Could not fetch your organisation's services. Check your connection or sign in again."}
              </p>
            </article>
          )}

          {/* Service admin – stats */}
          {isServiceAdmin && serviceAdminServicesQuery.data && (
            <ServiceAdminStats services={serviceAdminServicesQuery.data} />
          )}

          {/* Super admin – headline numbers */}
          {isSuperAdmin && dashboardQuery.data && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-2">
              {dashboardQuery.data.organizationMetrics.map((m) => (
                <StatCard key={m.label} label={m.label} value={m.value} />
              ))}
              {dashboardQuery.data.serviceMetrics.map((m) => (
                <StatCard key={m.label} label={m.label} value={m.value} />
              ))}
            </div>
          )}

          {/* Super admin – referral charts */}
          {/* {isSuperAdmin && poolReferralsQuery.isLoading && (
            <article className="access-note">
              <h2>Loading referral data</h2>
              <p>Pulling pool referrals for your dashboard…</p>
            </article>
          )}

          {isSuperAdmin && poolReferralsQuery.isError && (
            <article className="access-note error-block">
              <h2>Could not load referral data</h2>
              <p>
                {poolReferralsQuery.error instanceof Error
                  ? poolReferralsQuery.error.message
                  : "Unknown error"}
              </p>
              <button type="button" className="btn btn-outline" onClick={() => window.location.reload()}>
                Reload page
              </button>
            </article>
          )}

          {isSuperAdmin && poolReferralsQuery.data && (
            <SuperAdminStats referrals={poolReferralsQuery.data} />
          )} */}

        </>
      )}
    </section>
  );
}

export default DashboardPage;
