import { Route } from "react-router-dom";
import ProtectedRoute from "../../routes/ProtectedRoute";
import NotificationsPage from "./NotificationsPage";

export function NotificationRoutes() {
  return (
    <Route
      path="notifications"
      element={
        <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
          <NotificationsPage />
        </ProtectedRoute>
      }
    />
  );
}
