import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { loginUser, logoutUser } from "../auth";
import { AUTH_REFRESHED_EVENT, AUTH_REQUIRED_EVENT } from "../authEvents";
import { AuthContext } from "./authContextValue";
import { buildAuthSession } from "./authSession";
import { persistSession, readStoredSession } from "./authStorage";
import type { AuthContextValue, AuthSession } from "./authTypes";

const WORKSPACE_STORAGE_KEY = "refconnect.active.workspace";

const readStoredWorkspace = (): string | undefined => {
  try {
    return window.localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession());
  const [storedWorkspaceId, setStoredWorkspaceId] = useState<string | undefined>(
    () => readStoredWorkspace(),
  );

  const activeWorkspaceId = storedWorkspaceId ?? session?.facilityId;

  const setActiveWorkspace = useCallback((id: string) => {
    setStoredWorkspaceId(id);
    try {
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, id);
    } catch {
      // ignore
    }
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

    saveSession(nextSession);
    return result;
  }, [saveSession]);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      saveSession(null);
    }
  }, [saveSession]);

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
      setActiveWorkspace,
      signIn,
      logout,
      refreshSession,
    }),
    [activeWorkspaceId, logout, refreshSession, session, setActiveWorkspace, signIn],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
