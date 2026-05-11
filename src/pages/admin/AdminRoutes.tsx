import { Route } from "react-router-dom";
import ProtectedRoute from "../../routes/ProtectedRoute";
import AdminPage from "./AdminPage";
import AdminOrgPage from "./AdminOrgPage";

export function AdminRoutes() {
  return (
    <>
      <Route
        path="admin"
        element={
          <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
            <AdminPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="admin/:orgId"
        element={
          <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
            <AdminOrgPage />
          </ProtectedRoute>
        }
      />
    </>
  );
}
