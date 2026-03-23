import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  getAuthenticatedUser,
  getAuthTokens,
  getUserRoles,
  loginUser,
  logoutUser,
  type LoginUserResult,
} from "../auth";
import { AUTH_REFRESHED_EVENT, AUTH_REQUIRED_EVENT } from "../authEvents";

export type AppRole = "SUPER_ADMIN" | "HOSPITAL_ADMIN" | "DOCTOR" | "NURSE";

export type AuthSession = {
  accessToken: string;
  idToken: string;
  role: AppRole | null;
  email?: string;
  facilityId?: string;
};

type AuthContextValue = {
  session: AuthSession | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<LoginUserResult>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AUTH_STORAGE_KEY = "refconnect.auth.session";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeRole(input?: string | null): AppRole | null {
  if (!input) {
    return null;
  }

  const cleaned = input.trim().toUpperCase().replace(/[\s-]+/g, "_");

  if (cleaned === "SUPER_ADMIN") {
    return "SUPER_ADMIN";
  }

  if (cleaned === "HOSPITAL_ADMIN" || cleaned === "ADMIN") {
    return "HOSPITAL_ADMIN";
  }

  if (cleaned === "DOCTOR") {
    return "DOCTOR";
  }

  if (cleaned === "NURSE" || cleaned === "USER") {
    return "NURSE";
  }

  return null;
}

function extractRoleFromClaimValue(value: unknown): AppRole | null {
  if (typeof value === "string") {
    return normalizeRole(value);
  }

  if (Array.isArray(value)) {
    for (const roleCandidate of value) {
      if (typeof roleCandidate !== "string") {
        continue;
      }

      const normalizedRole = normalizeRole(roleCandidate);
      if (normalizedRole) {
        return normalizedRole;
      }
    }
  }

  return null;
}

function extractRoleFromClaims(claims?: Record<string, unknown>): AppRole | null {
  if (!claims) {
    return null;
  }

  const directClaims = ["custom:role", "role", "roles", "cognito:groups"] as const;
  for (const claim of directClaims) {
    const role = extractRoleFromClaimValue(claims[claim]);
    if (role) {
      return role;
    }
  }

  return null;
}

function extractRoleFromGroups(groups: string[]): AppRole | null {
  for (const group of groups) {
    const role = normalizeRole(group);
    if (role) {
      return role;
    }
  }

  return null;
}

function extractEmail(claims?: Record<string, unknown>): string | undefined {
  if (!claims) {
    return undefined;
  }

  const candidates = ["email", "username", "cognito:username"] as const;
  for (const key of candidates) {
    const value = claims[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return undefined;
}

function extractFacilityId(claims?: Record<string, unknown>): string | undefined {
  if (!claims) {
    return undefined;
  }

  const candidates = ["custom:facility_id", "facility_id", "facilityId"] as const;
  for (const key of candidates) {
    const value = claims[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

function readStoredSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }

    const accessToken = typeof parsed.accessToken === "string" ? parsed.accessToken : "";
    const idToken = typeof parsed.idToken === "string" ? parsed.idToken : "";
    if (!accessToken || !idToken) {
      return null;
    }

    const role = typeof parsed.role === "string" ? normalizeRole(parsed.role) : null;
    const email = typeof parsed.email === "string" ? parsed.email : undefined;
    const facilityId = typeof parsed.facilityId === "string" ? parsed.facilityId : undefined;

    return {
      accessToken,
      idToken,
      role,
      email,
      facilityId,
    };
  } catch {
    return null;
  }
}

function persistSession(session: AuthSession | null) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (session) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors to keep authentication flow non-blocking.
  }
}

async function buildSession(): Promise<AuthSession | null> {
  try {
    await getAuthenticatedUser();

    const [{ accessToken, idToken, accessTokenPayload, idTokenPayload }, userRoles] = await Promise.all([
      getAuthTokens(),
      getUserRoles(),
    ]);

    if (!accessToken || !idToken) {
      return null;
    }

    const roleFromGroups = extractRoleFromGroups(userRoles);
    const roleFromAccessToken = extractRoleFromClaims(accessTokenPayload);
    const roleFromIdToken = extractRoleFromClaims(idTokenPayload);

    const role = roleFromGroups ?? roleFromAccessToken ?? roleFromIdToken;
    const email = extractEmail(idTokenPayload) ?? extractEmail(accessTokenPayload);
    const facilityId = extractFacilityId(idTokenPayload) ?? extractFacilityId(accessTokenPayload);


    return {
      accessToken,
      idToken,
      role,
      email,
      facilityId,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession());

  const refreshSession = useCallback(async () => {
    const nextSession = await buildSession();
    setSession(nextSession);
    persistSession(nextSession);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await loginUser(email, password);
    if (!result.isSignedIn) {
      return result;
    }

    const nextSession = await buildSession();
    if (!nextSession) {
      throw new Error("Signed in but could not resolve the current session.");
    }

    setSession(nextSession);
    persistSession(nextSession);
    return result;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      setSession(null);
      persistSession(null);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleAuthRefreshed = () => {
      void refreshSession();
    };

    const handleAuthRequired = () => {
      setSession(null);
      persistSession(null);
    };

    window.addEventListener(AUTH_REFRESHED_EVENT, handleAuthRefreshed);
    window.addEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);

    return () => {
      window.removeEventListener(AUTH_REFRESHED_EVENT, handleAuthRefreshed);
      window.removeEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);
    };
  }, [refreshSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: Boolean(session?.accessToken),
      signIn,
      logout,
      refreshSession,
    }),
    [logout, refreshSession, session, signIn],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used inside AuthProvider");
  }
  return context;
}
