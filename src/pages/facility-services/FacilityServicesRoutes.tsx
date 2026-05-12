import { Route } from "react-router-dom";
import ProtectedRoute from "../../routes/ProtectedRoute";
import FacilityServicesPage from "./FacilityServicesPage";

export function FacilityServicesRoutes() {
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
    </>
  );
}
