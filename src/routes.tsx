import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import { WorkspaceLayout } from "./routes/WorkspaceLayout";
import { useAuthContext } from "./context/useAuthContext";
import { PublicRoutes } from "./pages/public/PublicRoutes";
import { AuthRoutes } from "./pages/auth/AuthRoutes";
import { DashboardRoutes } from "./pages/dashboard/DashboardRoutes";
import { ReferralRoutes } from "./pages/referrals/ReferralRoutes";
import { FacilityRoutes } from "./pages/facilities/FacilityRoutes";
import { ServiceRoutes } from "./pages/services/ServiceRoutes";
import { FacilityServicesRoutes } from "./pages/facility-services/FacilityServicesRoutes";
import { AdminRoutes } from "./pages/admin/AdminRoutes";
import { NotificationRoutes } from "./pages/notifications/NotificationRoutes";
import { OrganizationRoutes } from "./pages/organization/OrganizationRoutes";
import { SettingsRoutes } from "./pages/settings/SettingsRoutes";

function WorkspaceFallback() {
  const { activeWorkspaceId, isAuthenticated } = useAuthContext();
  if (activeWorkspaceId) return <Navigate to={`/${activeWorkspaceId}/dashboard`} replace />;
  if (isAuthenticated) return <Navigate to="/pending" replace />;
  return <Navigate to="/signin" replace />;
}

function PendingWorkspacePage() {
  const { logout, session } = useAuthContext();
  const email = session?.email ?? "";
  return (
    <section className="grid place-items-center min-h-screen p-8">
      <article className="w-full max-w-md rounded-3xl border border-[rgba(10,52,60,0.13)] bg-[rgba(255,255,255,0.82)] p-10 shadow-[0_14px_34px_rgba(12,35,40,0.1)] text-center">
        <p className="eyebrow">Account Setup</p>
        <h1 className="mt-2.5 font-heading text-[#0d2230] text-2xl leading-tight tracking-tight">
          No organisation assigned
        </h1>
        <p className="mt-3.5 text-[#506071] text-[0.97rem] leading-relaxed">
          Your account <strong>{email}</strong> is not linked to any organisation yet.
          Ask your system administrator to invite you or assign your account to a facility.
        </p>
        <button
          className="mt-8 btn btn-outline text-sm"
          onClick={() => logout()}
        >
          Sign out
        </button>
      </article>
    </section>
  );
}

export default function RootRoutes() {
  return (
    <Routes>
      {/* ── Public routes ── */}
      {PublicRoutes()}

      {/* ── Auth routes ── */}
      {AuthRoutes()}

      {/* ── No-workspace landing for authenticated users without an org ── */}
      <Route path="/pending" element={<PendingWorkspacePage />} />

      {/* ── Legacy redirects ── */}
      <Route path="/dashboard" element={<WorkspaceFallback />} />
      <Route path="/admin" element={<WorkspaceFallback />} />
      <Route path="/notifications" element={<WorkspaceFallback />} />
      <Route path="/settings" element={<WorkspaceFallback />} />
      <Route path="/facilities" element={<WorkspaceFallback />} />

      {/* ── Workspace routes ── */}
      <Route path="/:workspaceId" element={<WorkspaceLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        {DashboardRoutes()}
        {ReferralRoutes()}
        {FacilityRoutes()}
        {ServiceRoutes()}
        {FacilityServicesRoutes()}
        {AdminRoutes()}
        {OrganizationRoutes()}
        {NotificationRoutes()}
        {SettingsRoutes()}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
