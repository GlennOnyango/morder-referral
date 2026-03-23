import type {
  HandlerReferralHistoryListResponse,
  HandlerReferralListResponse,
  HandlerReferralResponse,
  ModelsReferral,
  ModelsReferralHistory,
  ModelsReferralStatus,
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
  limit?: number;
  offset?: number;
};

export type ReferralCreateInput = ServiceCreateReferralInput;

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
