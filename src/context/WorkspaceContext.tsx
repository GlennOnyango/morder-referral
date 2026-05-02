import { createContext, useContext } from "react";

type WorkspaceContextValue = {
  workspaceId: string;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export const useWorkspace = (): WorkspaceContextValue => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceLayout");
  return ctx;
};

export { WorkspaceContext };
