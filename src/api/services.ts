import type {
  ApiCreateServiceRequest,
  ApiPaginatedResponse,
  ApiUpdateServiceRequest,
  ModelService as Service,
} from "../types/organizations.generated";
import { createApiClient } from "./httpClient";

const ORGANIZATIONS_BASE_URL =
  (import.meta.env.VITE_ORGANIZATIONS_API_BASE_URL as string | undefined) ??
  "https://nrs-organizations-production.up.railway.app";

const servicesApi = createApiClient(ORGANIZATIONS_BASE_URL);

function authHeaders(accessToken?: string) {
  if (!accessToken) {
    return undefined;
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export type ServiceUpsertInput = ApiCreateServiceRequest;

function normalizeServiceList(payload: Service[] | ApiPaginatedResponse | undefined): Service[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return Array.isArray(payload?.data) ? (payload.data as Service[]) : [];
}

export async function listOrganizationServices(
  organizationId: string,
  accessToken?: string,
): Promise<Service[]> {
  const response = await servicesApi.get<Service[] | ApiPaginatedResponse>(
    `/organizations/${organizationId}/services`,
    {
    headers: authHeaders(accessToken),
    },
  );

  return normalizeServiceList(response.data);
}

export async function createOrganizationService(
  organizationId: string,
  payload: ServiceUpsertInput,
  accessToken?: string,
): Promise<Service> {
  const response = await servicesApi.post<Service>(
    `/organizations/${organizationId}/services`,
    payload,
    {
      headers: authHeaders(accessToken),
    },
  );

  return response.data;
}

export async function updateServiceById(
  serviceId: string,
  payload: ApiUpdateServiceRequest,
  accessToken?: string,
): Promise<Service> {
  const response = await servicesApi.put<Service>(`/services/${serviceId}`, payload, {
    headers: authHeaders(accessToken),
  });

  return response.data;
}

export async function deleteServiceById(serviceId: string, accessToken?: string): Promise<void> {
  await servicesApi.delete(`/services/${serviceId}`, {
    headers: authHeaders(accessToken),
  });
}

export async function listFacilityServicesByCode(
  facilityCode: string,
  accessToken?: string,
): Promise<Service[]> {
  const response = await servicesApi.get<ApiPaginatedResponse>(
    `/organizations/facility/${facilityCode}/services`,
    { headers: authHeaders(accessToken) },
  );
  return normalizeServiceList(response.data);
}
