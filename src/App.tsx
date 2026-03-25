import { Link, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import NotificationsMenu from "./components/NotificationsMenu";
import { useAuthContext } from "./context/AuthContext";
import DashboardPage from "./pages/DashboardPage";
import AboutPage from "./pages/AboutPage";
import ConfirmSignUpPage from "./pages/ConfirmSignUpPage";
import HomePage from "./pages/HomePage";
import HowItWorksPage from "./pages/HowItWorksPage";
import OrganizationFormPage from "./pages/OrganizationFormPage";
import OrganizationCreateReferralPage from "./pages/OrganizationCreateReferralPage";
import OrganizationFacilityReferralsPage from "./pages/OrganizationFacilityReferralsPage";
import OrganizationPoolReferralDetailPage from "./pages/OrganizationPoolReferralDetailPage";
import OrganizationReferralsPage from "./pages/OrganizationReferralsPage";
import OrganizationServiceFormPage from "./pages/OrganizationServiceFormPage";
import OrganizationServicesPage from "./pages/OrganizationServicesPage";
import OrganizationUsersPage from "./pages/OrganizationUsersPage";
import OrganizationsPage from "./pages/OrganizationsPage";
import OrganizationWorkspacePage from "./pages/OrganizationWorkspacePage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import ProtectedRoute from "./routes/ProtectedRoute";



function App() {
  const { logout, isAuthenticated } = useAuthContext();
  const marketingLinks = [
    { to: "/how-it-works", label: "How it works" },
    { to: "/about", label: "About us" },
  ];

  return (
    <div className="landing-page">
      <div className="aurora a1" />
      <div className="aurora a2" />

      <header className="navbar">
        <Link className="brand" to="/" aria-label="RefConnect Kenya home">
          <span className="brand-dot" />
          <span className="brand-copy">
            <strong>RefConnect Kenya</strong>
            <small>Medical Referral Exchange</small>
          </span>
        </Link>

        <nav className="marketing-nav" aria-label="Primary">
          {marketingLinks.map((link) => (
            <Link key={link.to} className="marketing-nav-link" to={link.to}>
              {link.label}
            </Link>
          ))}
        </nav>

        {isAuthenticated ? (
          <div className="nav-actions">
            <NotificationsMenu />
            <Link className="btn btn-ghost" to="/dashboard">
              Dashboard
            </Link>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                void logout();
              }}
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="nav-actions">
            <Link className="btn btn-ghost" to="/signin">
              Sign in
            </Link>
            <Link className="btn btn-primary" to="/signup">
              Sign up
            </Link>
          </div>
        )}
      </header>

      <main>
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
      </main>
    </div>
  );
}

export default App;
