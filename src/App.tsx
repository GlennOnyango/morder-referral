import { Link, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import { useAuthContext } from "./context/AuthContext";
import DashboardPage from "./pages/DashboardPage";
import ConfirmSignUpPage from "./pages/ConfirmSignUpPage";
import HomePage from "./pages/HomePage";
import OrganizationFormPage from "./pages/OrganizationFormPage";
import OrganizationPatientsPage from "./pages/OrganizationPatientsPage";
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

        {isAuthenticated ? (
          <div className="nav-actions">
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
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/confirm-signup" element={<ConfirmSignUpPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
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
              <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                <OrganizationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/facilities/new"
            element={
              <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                <OrganizationFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/facilities/:id/edit"
            element={
              <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                <OrganizationFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/facilities/:id"
            element={
              <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                <OrganizationWorkspacePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/facilities/:id/services"
            element={
              <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                <OrganizationServicesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/facilities/:id/patients"
            element={
              <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                <OrganizationPatientsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/facilities/:id/users"
            element={
              <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                <OrganizationUsersPage />
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


