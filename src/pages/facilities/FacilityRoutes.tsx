import { Route } from "react-router-dom";
import ProtectedRoute from "../../routes/ProtectedRoute";
import FacilityServicesPage from "./FacilityServicesPage";
import OrganizationFormPage from "./OrganizationFormPage";
import OrganizationServiceFormPage from "./OrganizationServiceFormPage";
import OrganizationServicesPage from "./OrganizationServicesPage";
import OrganizationUsersPage from "./OrganizationUsersPage";
import OrganizationsPage from "./OrganizationsPage";
import OrganizationWorkspacePage from "../organization/OrganizationWorkspacePage";

export function FacilityRoutes() {
  return (
    <>
      <Route
        path="facility-services"
        element={
          <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
            <FacilityServicesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="users"
        element={
          <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
            <OrganizationUsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="organization"
        element={
          <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
            <OrganizationWorkspacePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="organization/new"
        element={
          <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
            <OrganizationFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="organization/edit"
        element={
          <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
            <OrganizationFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="organizations"
        element={
          <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
            <OrganizationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="services"
        element={
          <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SERVICE_ADMIN", "SUPER_ADMIN"]}>
            <OrganizationServicesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="services/create"
        element={
          <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
            <OrganizationServiceFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="services/:serviceId/edit"
        element={
          <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
            <OrganizationServiceFormPage />
          </ProtectedRoute>
        }
      />
    </>
  );
}
