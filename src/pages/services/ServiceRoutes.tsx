import { Route } from "react-router-dom";
import ProtectedRoute from "../../routes/ProtectedRoute";
import OrganizationServicesPage from "./ServicesPage";
import OrganizationServiceFormPage from "./ServiceFormPage";

export function ServiceRoutes() {
  return (
    <>
      <Route
        path="services"
        element={
          <ProtectedRoute allowedRoles={["SERVICE_ADMIN"]}>
            <OrganizationServicesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="services/create"
        element={
          <ProtectedRoute allowedRoles={["SERVICE_ADMIN"]}>
            <OrganizationServiceFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="services/:serviceId/edit"
        element={
          <ProtectedRoute allowedRoles={["SERVICE_ADMIN"]}>
            <OrganizationServiceFormPage />
          </ProtectedRoute>
        }
      />
    </>
  );
}
