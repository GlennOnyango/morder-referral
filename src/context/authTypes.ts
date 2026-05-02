import type { LoginUserResult } from "../auth";
import type { ModelOrganization } from "../types/organizations.generated";

export type AppRole = "SUPER_ADMIN" | "HOSPITAL_ADMIN" | "DOCTOR" | "NURSE" | "SERVICE_ADMIN";

export type AuthSession = {
  accessToken: string;
  idToken: string;
  roles: AppRole[];
  email?: string;
  facilityId?: string;
};

export type AuthContextValue = {
  session: AuthSession | null;
  isAuthenticated: boolean;
  activeWorkspaceId: string | undefined;
  activeWorkspace: ModelOrganization | null;
  setActiveWorkspace: (id: string, workspace?: ModelOrganization | null) => void;
  signIn: (email: string, password: string) => Promise<LoginUserResult>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
};
