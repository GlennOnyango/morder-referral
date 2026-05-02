import { Navigate, Outlet, useParams } from "react-router-dom";
import { WorkspaceContext } from "../context/WorkspaceContext";

export function WorkspaceLayout() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  if (!workspaceId) return <Navigate to="/" replace />;
  return (
    <WorkspaceContext.Provider value={{ workspaceId }}>
      <Outlet />
    </WorkspaceContext.Provider>
  );
}
