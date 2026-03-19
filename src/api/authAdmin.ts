import axios from "axios";

const AUTHENTICATION_BASE_URL =
  (import.meta.env.VITE_AUTHENTICATION_API_BASE_URL as string | undefined) ??
  "https://nrs-authentication-production.up.railway.app";
const ATTACH_ROLE_PATH =
  (import.meta.env.VITE_AUTH_ATTACH_ROLE_PATH as string | undefined) ??
  "/auth/me/attach-role";
const FACILITY_USERS_PATH =
  (import.meta.env.VITE_AUTH_FACILITY_USERS_PATH as string | undefined) ??
  "/get-facility-users";

const authAdminApi = axios.create({
  baseURL: AUTHENTICATION_BASE_URL,
});

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
  if (Array.isArray(raw)) {
    return raw.filter((value): value is string => typeof value === "string");
  }

  if (typeof raw === "string" && raw.trim().length > 0) {
    return [raw.trim()];
  }

  return [];
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

export type AuthGroupName = "USER" | "ADMIN" | "SUPER_ADMIN";

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
  const groups = parseGroups(
    input.groups ?? input.groupNames ?? input.roles ?? input.role ?? input["cognito:groups"],
  );

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
  return rawUsers
    .map((rawUser) => normalizeUser(rawUser))
    .filter((user): user is AuthUser => Boolean(user));
}

export async function listFacilityUsers(
  facilityId: string,
  accessToken?: string,
): Promise<AuthUser[]> {
  const trimmedFacilityId = facilityId.trim();
  if (!trimmedFacilityId) {
    throw new Error("Missing facility_id. Sign in again or contact support.");
  }

  const response = await authAdminApi.get<unknown>(FACILITY_USERS_PATH, {
    params: { facility_id: trimmedFacilityId },
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
