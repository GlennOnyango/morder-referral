import type { LoginUserResult } from "../auth";

export type AppRole = "SUPER_ADMIN" | "HOSPITAL_ADMIN" | "DOCTOR" | "NURSE" | "SERVICE_ADMIN";

export type AuthSession = {
  accessToken: string;
  idToken: string;
  role: AppRole | null;
  email?: string;
  facilityId?: string;
};

export type AuthContextValue = {
  session: AuthSession | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<LoginUserResult>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
};
