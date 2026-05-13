import type {
  ApiCreateServiceRequestRequest,
  ApiUpdateServiceRequestStatusRequest,
  ModelServiceRequest,
  ModelServiceRequestMessage,
  ApiCreateServiceRequestMessageRequest,
  ApiPaginatedResponse,
} from "../types/organizations.generated";
import { createApiClient } from "./httpClient";

const ORGANIZATIONS_BASE_URL =
  (import.meta.env.VITE_ORGANIZATIONS_API_BASE_URL as string | undefined) ??
  "https://nrs-organizations-production.up.railway.app";

const serviceRequestsApi = createApiClient(ORGANIZATIONS_BASE_URL);

function authHeaders(accessToken?: string) {
  if (!accessToken) return undefined;
  return { Authorization: `Bearer ${accessToken}` };
}

function normalizePaginatedList<T>(payload: ApiPaginatedResponse | T[] | undefined): T[] {
  if (Array.isArray(payload)) return payload as T[];
  return Array.isArray((payload as ApiPaginatedResponse)?.data)
    ? ((payload as ApiPaginatedResponse).data as T[])
    : [];
}

export type ServiceRequestCreateInput = ApiCreateServiceRequestRequest;
export type ServiceRequestStatusUpdateInput = ApiUpdateServiceRequestStatusRequest;
export type ServiceRequestMessageCreateInput = ApiCreateServiceRequestMessageRequest;

export async function createServiceRequest(
  payload: ServiceRequestCreateInput,
  accessToken?: string,
): Promise<ModelServiceRequest> {
  const response = await serviceRequestsApi.post<ModelServiceRequest>(
    "/service-requests",
    payload,
    { headers: authHeaders(accessToken) },
  );
  return response.data;
}

export async function listOutgoingServiceRequests(
  organizationId: string,
  accessToken?: string,
): Promise<ModelServiceRequest[]> {
  const response = await serviceRequestsApi.get<ApiPaginatedResponse | ModelServiceRequest[]>(
    `/organizations/${organizationId}/service-requests/outgoing`,
    { headers: authHeaders(accessToken) },
  );
  return normalizePaginatedList<ModelServiceRequest>(response.data);
}

export async function listIncomingServiceRequests(
  organizationId: string,
  accessToken?: string,
): Promise<ModelServiceRequest[]> {
  const response = await serviceRequestsApi.get<ApiPaginatedResponse | ModelServiceRequest[]>(
    `/organizations/${organizationId}/service-requests/incoming`,
    { headers: authHeaders(accessToken) },
  );
  return normalizePaginatedList<ModelServiceRequest>(response.data);
}

export async function updateServiceRequestStatus(
  serviceRequestId: string,
  payload: ServiceRequestStatusUpdateInput,
  accessToken?: string,
): Promise<ModelServiceRequest> {
  const response = await serviceRequestsApi.patch<ModelServiceRequest>(
    `/service-requests/${serviceRequestId}/status`,
    payload,
    { headers: authHeaders(accessToken) },
  );
  return response.data;
}

export async function listServiceRequestMessages(
  serviceRequestId: string,
  organizationId: string,
  accessToken?: string,
): Promise<ModelServiceRequestMessage[]> {
  const response = await serviceRequestsApi.get<ApiPaginatedResponse | ModelServiceRequestMessage[]>(
    `/service-requests/${serviceRequestId}/messages`,
    {
      params: { organization_id: organizationId },
      headers: authHeaders(accessToken),
    },
  );
  return normalizePaginatedList<ModelServiceRequestMessage>(response.data);
}

export async function createServiceRequestMessage(
  serviceRequestId: string,
  payload: ServiceRequestMessageCreateInput,
  accessToken?: string,
): Promise<ModelServiceRequestMessage> {
  const response = await serviceRequestsApi.post<ModelServiceRequestMessage>(
    `/service-requests/${serviceRequestId}/messages`,
    payload,
    { headers: authHeaders(accessToken) },
  );
  return response.data;
}
