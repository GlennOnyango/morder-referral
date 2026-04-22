import type { AuthSession } from "./authTypes";
import { normalizeRole } from "./authRole";

const AUTH_STORAGE_KEY = "refconnect.auth.session";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseStoredSession = (value: unknown): AuthSession | null => {
  if (!isRecord(value)) {
    return null;
  }

  const accessToken = typeof value.accessToken === "string" ? value.accessToken : "";
  const idToken = typeof value.idToken === "string" ? value.idToken : "";
  if (!accessToken || !idToken) {
    return null;
  }

  return {
    accessToken,
    idToken,
    role: typeof value.role === "string" ? normalizeRole(value.role) : null,
    email: typeof value.email === "string" ? value.email : undefined,
    facilityId: typeof value.facilityId === "string" ? value.facilityId : undefined,
  };
};

export const readStoredSession = (): AuthSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawSession = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return rawSession ? parseStoredSession(JSON.parse(rawSession) as unknown) : null;
  } catch {
    return null;
  }
};

export const persistSession = (session: AuthSession | null): void => {
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
    // Storage can fail in private or restricted browsing contexts.
  }
};
