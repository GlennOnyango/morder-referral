import { Route } from "react-router-dom";
import ProtectedRoute from "../../routes/ProtectedRoute";
import OrganizationWorkspacePage from "./OrganizationWorkspacePage";

export function OrganizationRoutes() {
  return (
    <Route
      path="organization"
      element={
        <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SERVICE_ADMIN", "SUPER_ADMIN"]}>
          <OrganizationWorkspacePage />
        </ProtectedRoute>
      }
    />
  );
}
