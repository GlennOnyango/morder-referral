import axios from "axios";
import type {
  ApiCreateOrganizationRequest,
  ApiUpdateOrganizationRequest,
  ModelOrganization as Organization,
} from "../types/organizations.generated";
import { createApiClient } from "./httpClient";

const ORGANIZATIONS_BASE_URL =
  (import.meta.env.VITE_ORGANIZATIONS_API_BASE_URL as string | undefined) ??
  "https://nrs-organizations-production.up.railway.app";

const organizationsApi = createApiClient(ORGANIZATIONS_BASE_URL);

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

function extractFacilityId(payload: unknown): string | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  const directFacilityId = pickString(payload, [
    "facility_id",
    "facilityId",
    "organization_id",
    "organizationId",
    "id",
  ]);
  if (directFacilityId) {
    return directFacilityId;
  }

  const nestedCandidates = ["organization", "data", "result", "item"] as const;
  for (const key of nestedCandidates) {
    const nestedFacilityId = extractFacilityId(payload[key]);
    if (nestedFacilityId) {
      return nestedFacilityId;
    }
  }

  return undefined;
}

function authHeaders(accessToken?: string) {
  if (!accessToken) {
    return undefined;
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export type OrganizationCreateInput = ApiCreateOrganizationRequest;
export type OrganizationUpdateInput = ApiUpdateOrganizationRequest;
export type FacilityCodeValidationResult = {
  exists: boolean;
  facilityId?: string;
};

export async function validateOrganizationFacilityCode(
  facilityCode: string,
): Promise<FacilityCodeValidationResult> {
  const trimmedFacilityCode = facilityCode.trim();
  if (!trimmedFacilityCode) {
    return { exists: false };
  }

  try {
    const response = await organizationsApi.get<unknown>(
      `/organizations/validate/${encodeURIComponent(trimmedFacilityCode)}`,
    );
    const facilityId = extractFacilityId(response.data);

    if (!facilityId) {
      return { exists: false };
    }

    return {
      exists: true,
      facilityId,
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return { exists: false };
    }

    throw error;
  }
}

export async function listOrganizations(accessToken?: string): Promise<Organization[]> {
  const response = await organizationsApi.get<Organization[]>("/organizations", {
    params: { limit: 1000, offset: 0 },
    headers: authHeaders(accessToken),
  });

  return response.data;
}

export async function getOrganizationById(
  id: string,
  accessToken?: string,
): Promise<Organization> {
  const response = await organizationsApi.get<Organization>(`/organizations/${id}`, {
    headers: authHeaders(accessToken),
  });

  return response.data;
}

export async function createOrganization(
  payload: OrganizationCreateInput,
  accessToken?: string,
): Promise<Organization> {
  const response = await organizationsApi.post<Organization>("/organizations", payload, {
    headers: authHeaders(accessToken),
  });

  return response.data;
}

export async function updateOrganization(
  id: string,
  payload: OrganizationUpdateInput,
  accessToken?: string,
): Promise<Organization> {
  const response = await organizationsApi.put<Organization>(`/organizations/${id}`, payload, {
    headers: authHeaders(accessToken),
  });

  return response.data;
}

export async function deleteOrganization(id: string, accessToken?: string): Promise<void> {
  await organizationsApi.delete(`/organizations/${id}`, {
    headers: authHeaders(accessToken),
  });
}
