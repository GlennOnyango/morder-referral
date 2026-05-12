import { Route } from "react-router-dom";
import ProtectedRoute from "../../routes/ProtectedRoute";
import SettingsPage from "./SettingsPage";

export function SettingsRoutes() {
  return (
    <Route
      path="settings"
      element={
        <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN", "SERVICE_ADMIN"]}>
          <SettingsPage />
        </ProtectedRoute>
      }
    />
  );
}
