import { isAxiosError } from "axios";
import type { AuthGroupName, AuthUser } from "../../api/authAdmin";
import type { AppRole } from "../../context/AuthContext";
import { PERMISSION_ROWS, SETTINGS_STORAGE_KEY, type PermissionKey, type SettingsState } from "./types";

export const defaultSettings = (): SettingsState => ({
  permissions: {
    createReferrals: ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "NURSE"],
    approveReferrals: ["SUPER_ADMIN", "HOSPITAL_ADMIN"],
    directReferrals: ["SUPER_ADMIN", "HOSPITAL_ADMIN"],
    manageStaff: ["SUPER_ADMIN", "HOSPITAL_ADMIN"],
    manageSettings: ["SUPER_ADMIN", "HOSPITAL_ADMIN"],
    aiSearch: ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR"],
    aiReview: ["SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR"],
  },
  requireApprovalAfterCreation: true,
  allowDirectReferrals: false,
  aiEnabled: true,
  aiSearchEnabled: true,
  aiReviewEnabled: true,
});

export const isRole = (value: unknown): value is AppRole =>
  value === "SUPER_ADMIN" ||
  value === "HOSPITAL_ADMIN" ||
  value === "DOCTOR" ||
  value === "NURSE";

export const readStoredSettings = (): SettingsState => {
  if (typeof window === "undefined") return defaultSettings();

  const fallback = defaultSettings();
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return fallback;

    const payload = parsed as Partial<SettingsState>;
    const parsedPermissions = (payload.permissions ?? {}) as Partial<Record<PermissionKey, unknown>>;
    const permissions = { ...fallback.permissions };

    for (const row of PERMISSION_ROWS) {
      const values = parsedPermissions[row.key];
      if (!Array.isArray(values)) continue;
      const roles = values.filter((v): v is AppRole => isRole(v));
      permissions[row.key] = Array.from(new Set(roles));
    }

    return {
      permissions,
      requireApprovalAfterCreation:
        typeof payload.requireApprovalAfterCreation === "boolean"
          ? payload.requireApprovalAfterCreation
          : fallback.requireApprovalAfterCreation,
      allowDirectReferrals:
        typeof payload.allowDirectReferrals === "boolean"
          ? payload.allowDirectReferrals
          : fallback.allowDirectReferrals,
      aiEnabled:
        typeof payload.aiEnabled === "boolean" ? payload.aiEnabled : fallback.aiEnabled,
      aiSearchEnabled:
        typeof payload.aiSearchEnabled === "boolean"
          ? payload.aiSearchEnabled
          : fallback.aiSearchEnabled,
      aiReviewEnabled:
        typeof payload.aiReviewEnabled === "boolean"
          ? payload.aiReviewEnabled
          : fallback.aiReviewEnabled,
    };
  } catch {
    return fallback;
  }
};

export const formatError = (error: unknown): string => {
  if (isAxiosError(error)) {
    const payload = error.response?.data;
    if (payload && typeof payload === "object" && "message" in payload) {
      const value = (payload as { message?: unknown }).message;
      if (typeof value === "string") return value;
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Request failed. Please try again.";
};

export const isUserEnabled = (user: AuthUser): boolean => {
  if (typeof user.enabled === "boolean") return user.enabled;
  return (user.status ?? "").trim().toUpperCase() === "ENABLED";
};

export const inferDefaultGroup = (user: AuthUser): AuthGroupName => {
  const normalizedGroups = user.groups.map((g) => g.trim().toUpperCase());
  if (normalizedGroups.includes("HOSPITAL_ADMIN")) return "HOSPITAL_ADMIN";
  if (normalizedGroups.includes("DOCTOR")) return "DOCTOR";
  return "NURSE";
};
