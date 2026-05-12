import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { loginUser, logoutUser } from "../auth";
import { AUTH_REFRESHED_EVENT, AUTH_REQUIRED_EVENT } from "../authEvents";
import { AuthContext } from "./authContextValue";
import { buildAuthSession } from "./authSession";
import { persistSession, readStoredSession } from "./authStorage";
import type { ActiveWorkspace, AppRole, AuthContextValue, AuthSession, OrgType } from "./authTypes";
import type { ModelOrganization } from "../types/organizations.generated";
import { getOrganizationById } from "../api/organizations";
import { normalizeRole } from "./authRole";

const WORKSPACE_STORAGE_KEY = "refconnect.active.workspace";
const WORKSPACE_DETAILS_KEY = "refconnect.active.workspace.details";
const IMPERSONATION_KEY = "refconnect.impersonation";

const readStoredImpersonation = (): ModelOrganization | null => {
  try {
    const raw = window.sessionStorage.getItem(IMPERSONATION_KEY);
    return raw ? (JSON.parse(raw) as ModelOrganization) : null;
  } catch {
    return null;
  }
};

function resolveWorkspace(stored: string | undefined, session: AuthSession | null): string | undefined {
  if (stored) return stored;
  if (session?.facilityId) return session.facilityId;
  if (session?.roles?.includes("SUPER_ADMIN")) return "system";
  return undefined;
}

const readStoredWorkspace = (): string | undefined => {
  try {
    return window.localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
};

const readStoredWorkspaceDetails = (): ModelOrganization | null => {
  try {
    const raw = window.localStorage.getItem(WORKSPACE_DETAILS_KEY);
    return raw ? (JSON.parse(raw) as ModelOrganization) : null;
  } catch {
    return null;
  }
};

const clearWorkspaceStorage = () => {
  try {
    window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    window.localStorage.removeItem(WORKSPACE_DETAILS_KEY);
  } catch { /* ignore */ }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession());
  const [storedWorkspaceId, setStoredWorkspaceId] = useState<string | undefined>(
    () => readStoredWorkspace(),
  );
  const [activeWorkspace, setActiveWorkspaceDetails] = useState<ModelOrganization | null>(
    () => readStoredWorkspaceDetails(),
  );
  const [impersonatedOrg, setImpersonatedOrg] = useState<ModelOrganization | null>(
    () => readStoredImpersonation(),
  );

  const activeWorkspaceId = resolveWorkspace(storedWorkspaceId, session);

  const workspaceRoles = useMemo<AppRole[]>(() => {
    if (!session) return [];
    if (session.roles.includes("SUPER_ADMIN")) return ["SUPER_ADMIN"];
    const membership = session.userOrganizations.find(
      (o) => o.organizationId === activeWorkspaceId && o.active !== false,
    );
    if (!membership?.roleName) return [];
    const role = normalizeRole(membership.roleName);
    return role ? [role] : [];
  }, [session, activeWorkspaceId]);

  const organizationType = useMemo<OrgType | undefined>(() => {
    if (workspaceRoles.includes("HOSPITAL_ADMIN") || workspaceRoles.includes("HOSPITAL_MEMBER")) {
      return "facility";
    }
    if (workspaceRoles.includes("SERVICE_ADMIN")) {
      return "service-provider";
    }
    if (workspaceRoles.includes("SUPER_ADMIN") && activeWorkspace) {
      return activeWorkspace.organization_type === "service" ? "service-provider" : "facility";
    }
    return undefined;
  }, [workspaceRoles, activeWorkspace]);

  const activeWorkspaceWithType = useMemo<ActiveWorkspace | null>(() => {
    if (!activeWorkspace || organizationType === undefined) return null;
    return { ...activeWorkspace, organizationType };
  }, [activeWorkspace, organizationType]);

  const setActiveWorkspace = useCallback((id: string, workspace?: ModelOrganization | null) => {
    const details = workspace ?? null;
    setStoredWorkspaceId(id);
    setActiveWorkspaceDetails(details);
    try {
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, id);
      if (details) {
        window.localStorage.setItem(WORKSPACE_DETAILS_KEY, JSON.stringify(details));
      } else {
        window.localStorage.removeItem(WORKSPACE_DETAILS_KEY);
      }
    } catch { /* ignore */ }
  }, []);

  const saveSession = useCallback((nextSession: AuthSession | null) => {
    setSession(nextSession);
    persistSession(nextSession);
  }, []);

  const refreshSession = useCallback(async () => {
    const nextSession = await buildAuthSession();
    saveSession(nextSession);
  }, [saveSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await loginUser(email, password);
    if (!result.isSignedIn) {
      return result;
    }

    const nextSession = await buildAuthSession();
    if (!nextSession) {
      throw new Error("Signed in but could not resolve the current session.");
    }

    // Clear any stale workspace from a previous user's session before saving
    setStoredWorkspaceId(undefined);
    setActiveWorkspaceDetails(null);
    clearWorkspaceStorage();

    saveSession(nextSession);
    return result;
  }, [saveSession]);

  const startImpersonation = useCallback((org: ModelOrganization) => {
    setImpersonatedOrg(org);
    try { window.sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify(org)); } catch { /* ignore */ }
    setStoredWorkspaceId(String(org.id));
    setActiveWorkspaceDetails(org);
    try {
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, String(org.id));
      window.localStorage.setItem(WORKSPACE_DETAILS_KEY, JSON.stringify(org));
    } catch { /* ignore */ }
  }, []);

  const stopImpersonation = useCallback(() => {
    setImpersonatedOrg(null);
    try { window.sessionStorage.removeItem(IMPERSONATION_KEY); } catch { /* ignore */ }
    setStoredWorkspaceId("system");
    setActiveWorkspaceDetails(null);
    try {
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, "system");
      window.localStorage.removeItem(WORKSPACE_DETAILS_KEY);
    } catch { /* ignore */ }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      saveSession(null);
      setStoredWorkspaceId(undefined);
      setActiveWorkspaceDetails(null);
      setImpersonatedOrg(null);
      try { window.sessionStorage.removeItem(IMPERSONATION_KEY); } catch { /* ignore */ }
      clearWorkspaceStorage();
      window.location.replace("/signin");
    }
  }, [saveSession]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (!activeWorkspaceId || activeWorkspaceId === "system" || activeWorkspace || !session?.accessToken) {
      return;
    }
    getOrganizationById(activeWorkspaceId, session.accessToken)
      .then((org) => {
        setActiveWorkspaceDetails(org);
        try {
          window.localStorage.setItem(WORKSPACE_DETAILS_KEY, JSON.stringify(org));
        } catch { /* ignore */ }
      })
      .catch(() => { /* silently ignore — sidebar falls back to truncated ID */ });
  }, [activeWorkspaceId, activeWorkspace, session?.accessToken]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleAuthRefreshed = () => {
      void refreshSession();
    };

    const handleAuthRequired = () => {
      saveSession(null);
    };

    window.addEventListener(AUTH_REFRESHED_EVENT, handleAuthRefreshed);
    window.addEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);

    return () => {
      window.removeEventListener(AUTH_REFRESHED_EVENT, handleAuthRefreshed);
      window.removeEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);
    };
  }, [refreshSession, saveSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: Boolean(session?.accessToken),
      activeWorkspaceId,
      activeWorkspace: activeWorkspaceWithType,
      workspaceRoles,
      setActiveWorkspace,
      signIn,
      logout,
      refreshSession,
      impersonatedOrg,
      startImpersonation,
      stopImpersonation,
    }),
    [activeWorkspaceWithType, activeWorkspaceId, workspaceRoles, impersonatedOrg, logout, refreshSession, session, setActiveWorkspace, signIn, startImpersonation, stopImpersonation],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
