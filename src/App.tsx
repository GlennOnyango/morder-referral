import { Link, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import { useAuthContext } from "./context/AuthContext";
import DashboardPage from "./pages/DashboardPage";
import HomePage from "./pages/HomePage";
import OrganizationFormPage from "./pages/OrganizationFormPage";
import OrganizationServicesPage from "./pages/OrganizationServicesPage";
import OrganizationsPage from "./pages/OrganizationsPage";
import SignInPage from "./pages/SignInPage";
import ProtectedRoute from "./routes/ProtectedRoute";



function App() {
  const { logout, isAuthenticated, session } = useAuthContext();
  const canManageOrganizations = session?.role === "admin" || session?.role === "super_admin";

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
            {canManageOrganizations ? (
              <Link className="btn btn-ghost" to="/organizations">
                Organizations
              </Link>
            ) : null}
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
          </div>
        )}
      </header>

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute fallbackPath="/signin">
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizations"
            element={
              <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                <OrganizationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizations/new"
            element={
              <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                <OrganizationFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizations/:id/edit"
            element={
              <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                <OrganizationFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizations/:id/services"
            element={
              <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                <OrganizationServicesPage />
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
