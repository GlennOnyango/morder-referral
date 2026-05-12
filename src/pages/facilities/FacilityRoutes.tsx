import { Route } from "react-router-dom";
import ProtectedRoute from "../../routes/ProtectedRoute";
import FacilityPage from "./FacilityPage";
import FacilityFormPage from "./FacilityFormPage";

export function FacilityRoutes() {
  return (
    <>
      <Route
        path="organization/new"
        element={
          <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
            <FacilityFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="organization/edit"
        element={
          <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
            <FacilityFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="organizations"
        element={
          <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
            <FacilityPage />
          </ProtectedRoute>
        }
      />
    </>
  );
}
