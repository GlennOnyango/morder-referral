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

export const resolveRolesFromClaimValue = (value: unknown): AppRole[] => {
  const results: AppRole[] = [];

  if (typeof value === "string") {
    const role = normalizeRole(value);
    if (role) results.push(role);
    return results;
  }

  if (!Array.isArray(value)) {
    return results;
  }

  for (const candidate of value) {
    if (typeof candidate !== "string") continue;
    const role = normalizeRole(candidate);
    if (role) results.push(role);
  }

  return results;
};

export const resolveRolesFromClaims = (claims?: Record<string, unknown>): AppRole[] => {
  if (!claims) return [];

  const seen = new Set<AppRole>();
  const roleClaims = ["custom:role", "role", "roles", "cognito:groups"] as const;
  for (const claim of roleClaims) {
    for (const role of resolveRolesFromClaimValue(claims[claim])) {
      seen.add(role);
    }
  }

  return Array.from(seen);
};

export const resolveRolesFromGroups = (groups: string[]): AppRole[] => {
  const seen = new Set<AppRole>();
  for (const group of groups) {
    const role = normalizeRole(group);
    if (role) seen.add(role);
  }
  return Array.from(seen);
};
