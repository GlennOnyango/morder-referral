import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import DashboardPage from "./pages/dashboard/DashboardPage";
import SettingsPage from "./pages/settings/SettingsPage";
import AboutPage from "./pages/public/AboutPage";
import HomePage from "./pages/public/HomePage";
import HowItWorksPage from "./pages/public/HowItWorksPage";
import ConfirmSignUpPage from "./pages/auth/ConfirmSignUpPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import AcceptInvitePage from "./pages/auth/AcceptInvitePage";
import SignInPage from "./pages/auth/SignInPage";
import SignUpPage from "./pages/auth/SignUpPage";
import OrganizationFormPage from "./pages/facilities/OrganizationFormPage";
import OrganizationServicesPage from "./pages/facilities/OrganizationServicesPage";
import OrganizationServiceFormPage from "./pages/facilities/OrganizationServiceFormPage";
import OrganizationUsersPage from "./pages/facilities/OrganizationUsersPage";
import OrganizationsPage from "./pages/facilities/OrganizationsPage";
import OrganizationWorkspacePage from "./pages/facilities/OrganizationWorkspacePage";
import FacilityServicesPage from "./pages/facilities/FacilityServicesPage";
import OrganizationCreateReferralPage from "./pages/referrals/OrganizationCreateReferralPage";
import OrganizationFacilityReferralsPage from "./pages/referrals/OrganizationFacilityReferralsPage";
import OrganizationPoolReferralDetailPage from "./pages/referrals/OrganizationPoolReferralDetailPage";
import OrganizationReferralsPage from "./pages/referrals/OrganizationReferralsPage";
import NotificationsPage from "./pages/notifications/NotificationsPage";
import AdminPage from "./pages/admin/AdminPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import { WorkspaceLayout } from "./routes/WorkspaceLayout";
import { useAuthContext } from "./context/useAuthContext";

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

export default function LocalRoutes() {
  return (
    <Routes>
      {/* ── Public routes ── */}
      <Route path="/" element={<HomePage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/confirm-signup" element={<ConfirmSignUpPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/invite/:inviteId" element={<AcceptInvitePage />} />
      <Route path="/invites/:inviteId/accept" element={<AcceptInvitePage />} />

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

        <Route
          path="dashboard"
          element={
            <ProtectedRoute fallbackPath="/signin">
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="referrals"
          element={
            <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
              <OrganizationReferralsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="referrals/create"
          element={
            <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
              <OrganizationCreateReferralPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="referrals/pool/:referralCode"
          element={
            <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
              <OrganizationPoolReferralDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="referrals/facility"
          element={
            <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
              <OrganizationFacilityReferralsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="services"
          element={
            <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SERVICE_ADMIN", "SUPER_ADMIN"]}>
              <OrganizationServicesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="services/create"
          element={
            <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
              <OrganizationServiceFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="services/:serviceId/edit"
          element={
            <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
              <OrganizationServiceFormPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="facility-services"
          element={
            <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
              <FacilityServicesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="users"
          element={
            <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
              <OrganizationUsersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="organization"
          element={
            <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
              <OrganizationWorkspacePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="organization/new"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
              <OrganizationFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="organization/edit"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
              <OrganizationFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="organizations"
          element={
            <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
              <OrganizationsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="admin"
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
              <AdminPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="notifications"
          element={
            <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="settings"
          element={
            <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
