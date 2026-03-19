import axios from "axios";
import type {
  InternalApiCreateOrganizationRequest,
  InternalApiUpdateOrganizationRequest,
  MsOrganizationsInternalDomainModelOrganization as Organization,
} from "../types/api.generated";

const ORGANIZATIONS_BASE_URL =
  (import.meta.env.VITE_ORGANIZATIONS_API_BASE_URL as string | undefined) ??
  "https://nrs-organizations-production.up.railway.app";

const organizationsApi = axios.create({
  baseURL: ORGANIZATIONS_BASE_URL,
});

function authHeaders(accessToken?: string) {
  if (!accessToken) {
    return undefined;
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export type OrganizationUpsertInput = InternalApiCreateOrganizationRequest;

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
  payload: OrganizationUpsertInput,
  accessToken?: string,
): Promise<Organization> {
  const response = await organizationsApi.post<Organization>("/organizations", payload, {
    headers: authHeaders(accessToken),
  });

  return response.data;
}

export async function updateOrganization(
  id: string,
  payload: InternalApiUpdateOrganizationRequest,
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
