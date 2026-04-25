import { createApiClient } from "./httpClient";
import type { NrsAuthenticationInternalDtoListUsersOutputSwagger, NrsAuthenticationInternalDtoUserTypeSwagger } from "../types/auth.generated";

const AUTHENTICATION_BASE_URL =
  (import.meta.env.VITE_AUTHENTICATION_API_BASE_URL as string | undefined) ??
  "https://nrs-authentication-production.up.railway.app";
const ATTACH_ROLE_PATH =
  (import.meta.env.VITE_AUTH_ATTACH_ROLE_PATH as string | undefined) ??
  "/attach-role";
const FACILITY_USERS_PATH =
  (import.meta.env.VITE_AUTH_FACILITY_USERS_PATH as string | undefined) ??
  "/get-facility-users";
const ENABLE_USER_PATH =
  (import.meta.env.VITE_AUTH_ENABLE_USER_PATH as string | undefined) ??
  "/enable-user";
const DISABLE_USER_PATH =
  (import.meta.env.VITE_AUTH_DISABLE_USER_PATH as string | undefined) ??
  "/disable-user";
const DELETE_USER_PATH =
  (import.meta.env.VITE_AUTH_DELETE_USER_PATH as string | undefined) ??
  "/delete-user";
const GET_USER_PATH =
  (import.meta.env.VITE_AUTH_GET_USER_PATH as string | undefined) ??
  "/get-user";
const INVITE_USER_PATH =
  (import.meta.env.VITE_AUTH_INVITE_USER_PATH as string | undefined) ??
  "/invite-user";

const authAdminApi = createApiClient(AUTHENTICATION_BASE_URL);

function authHeaders(accessToken?: string) {
  if (!accessToken) {
    return undefined;
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function pickString(
  source: Record<string, unknown>,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

function pickBoolean(source: Record<string, unknown>, keys: readonly string[]): boolean | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "boolean") {
      return value;
    }
  }

  return undefined;
}

function parseAttributes(rawAttributes: unknown): Record<string, string> {
  if (Array.isArray(rawAttributes)) {
    return rawAttributes.reduce<Record<string, string>>((accumulator, item) => {
      if (!isRecord(item)) {
        return accumulator;
      }

      const name = pickString(item, ["Name", "name"]);
      const value = pickString(item, ["Value", "value"]);
      if (!name || !value) {
        return accumulator;
      }

      accumulator[name] = value;
      return accumulator;
    }, {});
  }

  if (!isRecord(rawAttributes)) {
    return {};
  }

  const attributes: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawAttributes)) {
    if (typeof value === "string") {
      attributes[key] = value;
    }
  }

  return attributes;
}

function parseGroups(raw: unknown): string[] {
  const groups = new Set<string>();

  const addGroup = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    groups.add(trimmed);
  };

  const visit = (value: unknown) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) {
        return;
      }

      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          const parsed = JSON.parse(trimmed) as unknown;
          visit(parsed);
          return;
        } catch {
          // Fall through to delimiter parsing when JSON parsing fails.
        }
      }

      if (trimmed.includes(",")) {
        trimmed.split(",").forEach((part) => addGroup(part));
        return;
      }

      addGroup(trimmed);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => visit(item));
      return;
    }

    if (!isRecord(value)) {
      return;
    }

    const objectGroupName = pickString(value, [
      "GroupName",
      "groupName",
      "name",
      "Name",
      "role",
      "Role",
      "value",
      "Value",
    ]);
    if (objectGroupName) {
      addGroup(objectGroupName);
    }

    const nestedKeys = [
      "groups",
      "groupNames",
      "roles",
      "role",
      "cognito:groups",
      "Groups",
      "UserGroups",
      "items",
      "data",
      "results",
    ] as const;
    for (const key of nestedKeys) {
      visit(value[key]);
    }
  };

  visit(raw);
  return Array.from(groups);
}

function extractUsersPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {

    return payload;
  }

  if (!isRecord(payload)) {
    return [];
  }

  const candidates = ["users", "data", "items", "results"] as const;
  for (const key of candidates) {
    const value = payload[key];
    if (Array.isArray(value)) {
      return value;
    }

    if (isRecord(value)) {
      const nested = extractUsersPayload(value);
      if (nested.length > 0) {
        return nested;
      }
    }
  }

  return [];
}

export type AuthUser = {
  username: string;
  email?: string;
  name?: string;
  status?: string;
  enabled?: boolean;
  groups: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type AuthGroupName = "HOSPITAL_ADMIN" | "DOCTOR" | "NURSE";
export const FACILITY_USER_GROUP_FILTERS = [
  "none",
  "all",
  "hospital_admin",
  "doctor",
  "nurse",
] as const;
export type FacilityUserGroupFilter = (typeof FACILITY_USER_GROUP_FILTERS)[number];

function normalizeUser(input: unknown): AuthUser | null {
  if (!isRecord(input)) {
    return null;
  }

  const attributes = parseAttributes(input.Attributes ?? input.attributes ?? input.userAttributes);
  const username =
    pickString(input, [
      "username",
      "Username",
      "userName",
      "preferred_username",
      "user_id",
      "userId",
      "id",
      "sub",
    ]) ??
    attributes.preferred_username ??
    attributes.sub ??
    attributes.email;

  if (!username) {
    return null;
  }

  const email = pickString(input, ["email", "Email"]) ?? attributes.email;
  const name = pickString(input, ["name", "Name", "full_name", "fullName"]) ?? attributes.name;
  const status =
    pickString(input, ["status", "Status", "UserStatus", "userStatus"]) ?? attributes.status;
  const enabled = pickBoolean(input, ["enabled", "Enabled"]);
  const createdAt =
    pickString(input, ["createdAt", "CreatedAt", "UserCreateDate"]) ?? attributes.created_at;
  const updatedAt =
    pickString(input, ["updatedAt", "UpdatedAt", "UserLastModifiedDate"]) ??
    attributes.updated_at;
  const groups = parseGroups([
    input.groups,
    input.groupNames,
    input.roles,
    input.role,
    input["cognito:groups"],
    input.Groups,
    input.UserGroups,
    attributes["cognito:groups"],
    attributes["custom:role"],
    attributes.groups,
  ]);

  return {
    username,
    email,
    name,
    status,
    enabled,
    groups,
    createdAt,
    updatedAt,
  };
}

function normalizeUsers(payload: unknown): AuthUser[] {
  const rawUsers = extractUsersPayload(payload);

  const rwuser = rawUsers
    .map((rawUser) => normalizeUser(rawUser))
    .filter((user): user is AuthUser => Boolean(user));
  return rwuser;
}

export async function listFacilityUsers(
  facility_code: string,
  group: FacilityUserGroupFilter,
  accessToken?: string,
): Promise<AuthUser[]> {
  const trimmedFacilityCode = facility_code.trim();
  if (!trimmedFacilityCode) {
    throw new Error("Missing facility_code. Sign in again or contact support.");
  }

  const response = await authAdminApi.get<unknown>(FACILITY_USERS_PATH, {
    params: { facility_code: trimmedFacilityCode, group },
    headers: authHeaders(accessToken),
  });


  return normalizeUsers(response.data);
}

export async function attachRoleToUser(
  input: { username: string; groupName: AuthGroupName },
  accessToken?: string,
) {
  const response = await authAdminApi.post(ATTACH_ROLE_PATH, input, {
    headers: authHeaders(accessToken),
  });

  return response.data;
}

export async function setUserEnabledStatus(
  input: { username: string; enabled: boolean; facility_code?: string },
  accessToken?: string,
) {
  const path = input.enabled ? ENABLE_USER_PATH : DISABLE_USER_PATH;
  const response = await authAdminApi.post(path, input, {
    headers: authHeaders(accessToken),
  });

  return response.data;
}

export async function deleteUser(
  input: { username: string; facility_code?: string },
  accessToken?: string,
) {
  const response = await authAdminApi.post(DELETE_USER_PATH, input, {
    headers: authHeaders(accessToken),
  });

  return response.data;
}

export async function getUser(email: string): Promise<NrsAuthenticationInternalDtoUserTypeSwagger | null> {
  const response = await authAdminApi.get<NrsAuthenticationInternalDtoListUsersOutputSwagger>(GET_USER_PATH, {
    params: { email },
  });

  return response.data.Users?.[0] ?? null;
}

export async function inviteUser(
  input: { email: string; facility_code: string; groupName: AuthGroupName },
  accessToken?: string,
): Promise<void> {
  await authAdminApi.post(INVITE_USER_PATH, input, {
    headers: authHeaders(accessToken),
  });
}
