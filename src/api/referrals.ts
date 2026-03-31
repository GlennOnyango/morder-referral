import type {
  HandlerAdditionalInformationRequestResponse,
  HandlerNotificationListResponse,
  HandlerNotificationResponse,
  HandlerReferralHistoryListResponse,
  HandlerReferralListResponse,
  HandlerReferralResponse,
  ModelsAdditionalInformationRequest,
  ModelsNotification,
  ModelsReferral,
  ModelsReferralHistory,
  ModelsReferralStatus,
  ServiceCreateAdditionalInformationRequestInput,
  ServiceAcceptReferralInput,
  ServiceCreateReferralInput,
} from "../types/referrals.generated";
import { createApiClient } from "./httpClient";

const REFERRALS_BASE_URL =
  (import.meta.env.VITE_REFERRALS_API_BASE_URL as string | undefined) ??
  "https://nrs-referrals-production.up.railway.app/api/v1";

const referralsApi = createApiClient(REFERRALS_BASE_URL);

function authHeaders(accessToken?: string) {
  if (!accessToken) {
    return undefined;
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

function normalizeReferral(referral: ModelsReferral | HandlerReferralResponse | undefined): ModelsReferral {
  return {
    acceptedAt: referral?.acceptedAt,
    acceptedByFacilityCode: referral?.acceptedByFacilityCode,
    clinicalSummary: referral?.clinicalSummary,
    createdAt: referral?.createdAt,
    id: referral?.id,
    metadata: referral?.metadata,
    modeOfPayment: referral?.modeOfPayment,
    notes: referral?.notes,
    originFacilityCode: referral?.originFacilityCode,
    patient: referral?.patient,
    priority: referral?.priority,
    raisedBySub: referral?.raisedBySub,
    raisedByUsername: referral?.raisedByUsername,
    reasonForReferral: referral?.reasonForReferral,
    referralCode: referral?.referralCode,
    serviceType: referral?.serviceType,
    status: referral?.status,
    updatedAt: referral?.updatedAt,
  };
}

export type FacilityReferralRole = "origin" | "accepted";

export type FacilityReferralListQuery = {
  status?: ModelsReferralStatus;
  role?: FacilityReferralRole;
  limit?: number;
  offset?: number;
};

export type ReferralPoolListQuery = {
  serviceType?: string;
  service?: string;
  patientName?: string;
  originFacility?: string;
  query?: string;
  limit?: number;
  offset?: number;
};

export type NotificationListQuery = {
  facilityCode?: string;
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
};

export type NotificationReadQuery = {
  facilityCode?: string;
};

export type ReferralSummaryChunkHandler = (chunk: string) => void;

export type ReferralCreateInput = ServiceCreateReferralInput;
export type CreateReferralInformationRequestInput = ServiceCreateAdditionalInformationRequestInput;

function parseSummaryStreamEventData(rawData: string): string {
  const trimmed = rawData.trim();
  if (!trimmed || trimmed === "[DONE]") {
    return "";
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed === "string") {
      return parsed;
    }

    if (parsed && typeof parsed === "object") {
      const candidate = parsed as {
        text?: unknown;
        summary?: unknown;
        delta?: unknown;
        content?: unknown;
        choices?: Array<{ delta?: { content?: unknown } }>;
      };

      if (typeof candidate.text === "string") {
        return candidate.text;
      }

      if (typeof candidate.summary === "string") {
        return candidate.summary;
      }

      if (typeof candidate.delta === "string") {
        return candidate.delta;
      }

      if (typeof candidate.content === "string") {
        return candidate.content;
      }

      const firstChoice = candidate.choices?.[0];
      if (typeof firstChoice?.delta?.content === "string") {
        return firstChoice.delta.content;
      }
    }
  } catch {
    return trimmed;
  }

  return "";
}

export async function listFacilityReferrals(
  facilityCode: string,
  query?: FacilityReferralListQuery,
  accessToken?: string,
): Promise<ModelsReferral[]> {
  const response = await referralsApi.get<HandlerReferralListResponse>(
    `/facilities/${encodeURIComponent(facilityCode)}/referrals`,
    {
      params: query,
      headers: authHeaders(accessToken),
    },
  );

  return (response.data.items ?? []).map((referral) => normalizeReferral(referral));
}

export async function listReferralPool(
  query?: ReferralPoolListQuery,
  accessToken?: string,
): Promise<ModelsReferral[]> {
  const response = await referralsApi.get<HandlerReferralListResponse>("/referrals/pool", {
    params: {
      service_type: query?.serviceType,
      service: query?.service,
      patient_name: query?.patientName,
      origin_facility: query?.originFacility,
      q: query?.query,
      limit: query?.limit,
      offset: query?.offset,
    },
    headers: authHeaders(accessToken),
  });

  return (response.data.items ?? []).map((referral) => normalizeReferral(referral));
}

export async function createReferral(
  payload: ReferralCreateInput,
  accessToken?: string,
): Promise<ModelsReferral> {
  const response = await referralsApi.post<HandlerReferralResponse>("/referrals", payload, {
    headers: authHeaders(accessToken),
  });

  return normalizeReferral(response.data);
}

export async function getReferralByCode(
  referralCode: string,
  accessToken?: string,
): Promise<ModelsReferral> {
  const response = await referralsApi.get<HandlerReferralResponse>(
    `/referrals/${encodeURIComponent(referralCode)}`,
    {
      headers: authHeaders(accessToken),
    },
  );

  return normalizeReferral(response.data);
}

export async function acceptReferralByCode(
  referralCode: string,
  payload: ServiceAcceptReferralInput,
  accessToken?: string,
): Promise<ModelsReferral> {
  const response = await referralsApi.post<HandlerReferralResponse>(
    `/referrals/${encodeURIComponent(referralCode)}/accept`,
    payload,
    {
      headers: authHeaders(accessToken),
    },
  );

  return normalizeReferral(response.data);
}

export async function getReferralHistoryByCode(
  referralCode: string,
  accessToken?: string,
): Promise<ModelsReferralHistory[]> {
  const response = await referralsApi.get<HandlerReferralHistoryListResponse>(
    `/referrals/${encodeURIComponent(referralCode)}/history`,
    {
      headers: authHeaders(accessToken),
    },
  );

  return response.data.items ?? [];
}

export async function streamReferralSummaryByCode(
  referralCode: string,
  onChunk: ReferralSummaryChunkHandler,
  accessToken?: string,
): Promise<string> {
  const response = await fetch(`${REFERRALS_BASE_URL}/referrals/${encodeURIComponent(referralCode)}/summary/stream`, {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  if (!response.ok) {
    let message = `Summary request failed with status ${response.status}.`;
    try {
      const payload = (await response.json()) as { message?: unknown };
      if (typeof payload.message === "string" && payload.message.trim()) {
        message = payload.message;
      }
    } catch {
      // Fall back to status-based message when response is not JSON.
    }
    throw new Error(message);
  }

  if (!response.body) {
    throw new Error("Summary stream is unavailable.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let eventData: string[] = [];
  let summary = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) {
        if (eventData.length > 0) {
          const chunk = parseSummaryStreamEventData(eventData.join("\n"));
          if (chunk) {
            summary += chunk;
            onChunk(chunk);
          }
          eventData = [];
        }
        continue;
      }

      if (line.startsWith("data:")) {
        eventData.push(line.slice(5).trimStart());
      }
    }
  }

  if (eventData.length > 0) {
    const chunk = parseSummaryStreamEventData(eventData.join("\n"));
    if (chunk) {
      summary += chunk;
      onChunk(chunk);
    }
  }

  return summary.trim();
}

export async function createReferralInformationRequest(
  referralId: string,
  payload: CreateReferralInformationRequestInput,
  accessToken?: string,
): Promise<ModelsAdditionalInformationRequest> {
  const response = await referralsApi.post<HandlerAdditionalInformationRequestResponse>(
    `/referrals/by-id/${encodeURIComponent(referralId)}/information-requests`,
    payload,
    {
      headers: authHeaders(accessToken),
    },
  );

  return response.data;
}

export async function listNotifications(
  query?: NotificationListQuery,
  accessToken?: string,
): Promise<ModelsNotification[]> {
  const response = await referralsApi.get<HandlerNotificationListResponse>("/notifications", {
    params: {
      facility_code: query?.facilityCode,
      unread_only: query?.unreadOnly,
      limit: query?.limit,
      offset: query?.offset,
    },
    headers: authHeaders(accessToken),
  });

  return response.data.items ?? [];
}

export async function markNotificationAsRead(
  id: string,
  query?: NotificationReadQuery,
  accessToken?: string,
): Promise<ModelsNotification> {
  const response = await referralsApi.patch<HandlerNotificationResponse>(
    `/notifications/${encodeURIComponent(id)}/read`,
    undefined,
    {
      params: {
        facility_code: query?.facilityCode,
      },
      headers: authHeaders(accessToken),
    },
  );

  return response.data;
}
