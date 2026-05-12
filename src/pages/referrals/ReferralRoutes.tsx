import {  Route } from "react-router-dom";
import ProtectedRoute from "../../routes/ProtectedRoute";
import ReferralPoolPage from "./pool/ReferralPoolPage";
import CreateReferralPage from "./pool/CreateReferralPage";
import PoolReferralDetailPage from "./pool/PoolReferralDetailPage";
import FacilityReferralsPage from "./facility/FacilityReferralsPage";
import FacilityReferralDetailPage from "./facility/FacilityReferralDetailPage";

export function ReferralRoutes() {
  return (
    <>
      <Route
        path="referral-pool"
        element={
          <ProtectedRoute fallbackPath="/signin">
            <ReferralPoolPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="referral-pool/:referralCode"
        element={
          <ProtectedRoute fallbackPath="/signin">
            <PoolReferralDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="referrals-facility/create"
        element={
          <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "SUPER_ADMIN"]}>
            <CreateReferralPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="referrals-facility/"
        element={
          <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "HOSPITAL_MEMBER", "SUPER_ADMIN"]}>
            <FacilityReferralsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="referrals-facility/:referralCode"
        element={
          <ProtectedRoute allowedRoles={["HOSPITAL_ADMIN", "HOSPITAL_MEMBER", "SUPER_ADMIN"]}>
            <FacilityReferralDetailPage />
          </ProtectedRoute>
        }
      />
    </>
  );
}
