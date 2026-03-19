import axios from "axios";

const AUTHENTICATION_BASE_URL =
  (import.meta.env.VITE_AUTHENTICATION_API_BASE_URL as string | undefined) ??
  "https://nrs-authentication-production.up.railway.app";
const ATTACH_ROLE_PATH =
  (import.meta.env.VITE_AUTH_ATTACH_ROLE_PATH as string | undefined) ??
  "/api/v1/auth/me/attach-role";
const AUTH_USERS_PATH =
  (import.meta.env.VITE_AUTH_USERS_PATH as string | undefined) ??
  "/api/v1/auth/users";

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
    pickString(input, ["username", "Username", "userName", "preferred_username"]) ??
    attributes.preferred_username ??
    attributes.email;

  if (!username) {
    return null;
  }

  const email = pickString(input, ["email", "Email"]) ?? attributes.email;
  const name = pickString(input, ["name", "Name"]) ?? attributes.name;
  const status =
    pickString(input, ["status", "Status", "UserStatus", "userStatus"]) ?? attributes.status;
  const enabled = pickBoolean(input, ["enabled", "Enabled"]);
  const createdAt =
    pickString(input, ["createdAt", "CreatedAt", "UserCreateDate"]) ?? attributes.created_at;
  const updatedAt =
    pickString(input, ["updatedAt", "UpdatedAt", "UserLastModifiedDate"]) ??
    attributes.updated_at;
  const groups = parseGroups(
    input.groups ?? input.groupNames ?? input.roles ?? input["cognito:groups"],
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

export async function listAllAuthUsers(accessToken?: string): Promise<AuthUser[]> {
  const candidatePaths = Array.from(new Set([AUTH_USERS_PATH, "/api/v1/auth/me/users"]));
  let last404 = false;

  for (const path of candidatePaths) {
    try {
      const response = await authAdminApi.get<unknown>(path, {
        headers: authHeaders(accessToken),
      });

      return normalizeUsers(response.data);
    } catch (error) {
      if (!axios.isAxiosError(error) || error.response?.status !== 404) {
        throw error;
      }

      last404 = true;
    }
  }

  if (last404) {
    throw new Error(
      "Could not find a users endpoint. Set VITE_AUTH_USERS_PATH to your authentication users route.",
    );
  }

  return [];
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
