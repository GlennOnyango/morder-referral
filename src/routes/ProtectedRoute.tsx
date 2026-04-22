import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type { AppRole } from "../context/authTypes";
import { useAuthContext } from "../context/useAuthContext";

type ProtectedRouteProps = {
  children: ReactNode;
  allowedRoles?: AppRole[];
  fallbackPath?: string;
};

function ProtectedRoute({ children, allowedRoles, fallbackPath = "/dashboard" }: ProtectedRouteProps) {
  const { isAuthenticated, session } = useAuthContext();

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  if (allowedRoles && (!session?.role || !allowedRoles.includes(session.role))) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
