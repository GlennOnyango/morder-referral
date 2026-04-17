import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import DashboardPage from "./pages/dashboard/DashboardPage";
import SettingsPage from "./pages/settings/SettingsPage";
import AboutPage from "./pages/public/AboutPage";
import HomePage from "./pages/public/HomePage";
import HowItWorksPage from "./pages/public/HowItWorksPage";
import ConfirmSignUpPage from "./pages/auth/ConfirmSignUpPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import SignInPage from "./pages/auth/SignInPage";
import SignUpPage from "./pages/auth/SignUpPage";
import OrganizationFormPage from "./pages/facilities/OrganizationFormPage";
import OrganizationServicesPage from "./pages/facilities/OrganizationServicesPage";
import OrganizationServiceFormPage from "./pages/facilities/OrganizationServiceFormPage";
import OrganizationUsersPage from "./pages/facilities/OrganizationUsersPage";
import OrganizationsPage from "./pages/facilities/OrganizationsPage";
import OrganizationWorkspacePage from "./pages/facilities/OrganizationWorkspacePage";
import OrganizationCreateReferralPage from "./pages/referrals/OrganizationCreateReferralPage";
import OrganizationFacilityReferralsPage from "./pages/referrals/OrganizationFacilityReferralsPage";
import OrganizationPoolReferralDetailPage from "./pages/referrals/OrganizationPoolReferralDetailPage";
import OrganizationReferralsPage from "./pages/referrals/OrganizationReferralsPage";
import NotificationsPage from "./pages/notifications/NotificationsPage";
import ProtectedRoute from "./routes/ProtectedRoute";

export default function LocalRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/confirm-signup" element={<ConfirmSignUpPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/users"
        element={
          <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
            <Navigate to="/facilities" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute fallbackPath="/signin">
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/facilities"
        element={
          <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
            <OrganizationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/facilities/new"
        element={
          <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
            <OrganizationFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/facilities/:id/edit"
        element={
          <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
            <OrganizationFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/facilities/:id"
        element={
          <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
            <OrganizationWorkspacePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/facilities/:id/services"
        element={
          <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
            <OrganizationServicesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/facilities/:id/services/create"
        element={
          <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
            <OrganizationServiceFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/facilities/:id/services/:serviceId/edit"
        element={
          <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
            <OrganizationServiceFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/facilities/:id/users"
        element={
          <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
            <OrganizationUsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/facilities/:id/referrals"
        element={
          <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
            <OrganizationReferralsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/facilities/:id/referrals/create"
        element={
          <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
            <OrganizationCreateReferralPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/facilities/:id/referrals/pool/:referralCode"
        element={
          <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
            <OrganizationPoolReferralDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/facilities/:id/referrals/facility"
        element={
          <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
            <OrganizationFacilityReferralsPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
