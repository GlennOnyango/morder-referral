import type { GithubComVaudKKNrsNotificationsInternalModelsNotification as Notification } from "@/types/notifications.generated";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;


export const extractPayloadMessage = (payload: unknown): string | null => {
  if (!isRecord(payload)) return null;
  for (const key of ["message", "description", "reason", "detail"] as const) {
    const v = payload[key];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return null;
};

export const getNotificationSummary = (n: Notification): string =>
  extractPayloadMessage(n.payload) ??
  (n.referralCode ? `Referral ${n.referralCode}` : null) ??
  (n.targetFacilityCode ? `Facility ${n.targetFacilityCode}` : null) ??
  "Referral workflow update";


  export function normalizeCountyCode(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return value.toString().padStart(3, "0");
  if (typeof value === "string" && value.trim().length > 0) return value.trim().padStart(3, "0");
  return "";
}

export function readStringFromRecord(source: unknown, keys: string[]): string {
  if (!source || typeof source !== "object") return "";
  const record = source as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return "";
}

export function readTransportAvailability(organization: unknown): boolean {
  if (!organization || typeof organization !== "object") return false;
  const record = organization as Record<string, unknown>;
  const value = record.transport_available ?? record.transportAvailable;
  return typeof value === "boolean" ? value : false;
}

