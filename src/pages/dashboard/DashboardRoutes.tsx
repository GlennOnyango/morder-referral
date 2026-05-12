import { Route } from "react-router-dom";
import ProtectedRoute from "../../routes/ProtectedRoute";
import DashboardPage from "./DashboardPage";

export function DashboardRoutes() {
  return (
    <Route
      path="dashboard"
      element={
        <ProtectedRoute fallbackPath="/signin">
          <DashboardPage />
        </ProtectedRoute>
      }
    />
  );
}
