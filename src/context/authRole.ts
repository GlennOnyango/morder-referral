import type { AppRole } from "./authTypes";

const ROLE_ALIASES: Record<string, AppRole> = {
  ADMIN: "HOSPITAL_ADMIN",
  DOCTOR: "DOCTOR",
  HOSPITAL_ADMIN: "HOSPITAL_ADMIN",
  NURSE: "NURSE",
  SUPER_ADMIN: "SUPER_ADMIN",
  USER: "NURSE",
  SERVICE_ADMIN:"SERVICE_ADMIN"
};

const normalizeRoleKey = (input: string): string => input.trim().toUpperCase().replace(/[\s-]+/g, "_");

export const normalizeRole = (input?: string | null): AppRole | null => {
  if (!input) {
    return null;
  }

  return ROLE_ALIASES[normalizeRoleKey(input)] ?? null;
};

export const resolveRoleFromClaimValue = (value: unknown): AppRole | null => {
  if (typeof value === "string") {
    return normalizeRole(value);
  }

  if (!Array.isArray(value)) {
    return null;
  }

  for (const roleCandidate of value) {
    if (typeof roleCandidate !== "string") {
      continue;
    }

    const role = normalizeRole(roleCandidate);
    if (role) {
      return role;
    }
  }

  return null;
};

export const resolveRoleFromClaims = (claims?: Record<string, unknown>): AppRole | null => {
  if (!claims) {
    return null;
  }

  const roleClaims = ["custom:role", "role", "roles", "cognito:groups"] as const;
  for (const claim of roleClaims) {
    const role = resolveRoleFromClaimValue(claims[claim]);
    if (role) {
      return role;
    }
  }

  return null;
};

export const resolveRoleFromGroups = (groups: string[]): AppRole | null => {
  for (const group of groups) {
    const role = normalizeRole(group);
    if (role) {
      return role;
    }
  }

  return null;
};
