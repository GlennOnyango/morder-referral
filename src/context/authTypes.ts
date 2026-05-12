import type { LoginUserResult } from "../auth";
import type { ModelOrganization } from "../types/organizations.generated";
import type { DtoUserOrganizationMappingResponse } from "../types/auth.generated";

export type AppRole = "SUPER_ADMIN" | "HOSPITAL_ADMIN" | "HOSPITAL_MEMBER" | "SERVICE_ADMIN";

export type OrgType = "facility" | "service-provider";

export type ActiveWorkspace = ModelOrganization & {
  organizationType: OrgType;
};

export type AuthSession = {
  accessToken: string;
  idToken: string;
  roles: AppRole[];
  email?: string;
  facilityId?: string;
  userOrganizations: DtoUserOrganizationMappingResponse[];
};

export type AuthContextValue = {
  session: AuthSession | null;
  isAuthenticated: boolean;
  activeWorkspaceId: string | undefined;
  activeWorkspace: ActiveWorkspace | null;
  workspaceRoles: AppRole[];
  setActiveWorkspace: (id: string, workspace?: ModelOrganization | null) => void;
  signIn: (email: string, password: string) => Promise<LoginUserResult>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  impersonatedOrg: ModelOrganization | null;
  startImpersonation: (org: ModelOrganization) => void;
  stopImpersonation: () => void;
};
