import type {
  GithubComVaudKKNrsNotificationsInternalModelsNotification as Notification,
  InternalHandlerNotificationListResponse as NotificationListResponse,
} from "../types/notifications.generated";
import { createApiClient } from "./httpClient";

const NOTIFICATIONS_BASE_URL =
  (import.meta.env.VITE_NOTIFICATIONS_API_BASE_URL as string | undefined) ??
  "https://nrs-notifications-production.up.railway.app";

const notificationsApi = createApiClient(NOTIFICATIONS_BASE_URL);

function authHeaders(accessToken?: string) {
  if (!accessToken) return undefined;
  return { Authorization: `Bearer ${accessToken}` };
}

export type NotificationListQuery = {
  facilityCode?: string;
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
};

export type NotificationReadQuery = {
  facilityCode?: string;
};

export async function listNotifications(
  query?: NotificationListQuery,
  accessToken?: string,
): Promise<Notification[]> {
  const response = await notificationsApi.get<NotificationListResponse>(
    "/api/v1/notifications",
    {
      params: {
        facility_code: query?.facilityCode,
        unread_only: query?.unreadOnly,
        limit: query?.limit,
        offset: query?.offset,
      },
      headers: authHeaders(accessToken),
    },
  );
  return response.data.items ?? [];
}

export async function markNotificationAsRead(
  id: string,
  query?: NotificationReadQuery,
  accessToken?: string,
): Promise<Notification> {
  const response = await notificationsApi.patch<Notification>(
    `/api/v1/notifications/${encodeURIComponent(id)}/read`,
    undefined,
    {
      params: { facility_code: query?.facilityCode },
      headers: authHeaders(accessToken),
    },
  );
  return response.data;
}

/**
 * Opens a server-sent events stream for real-time notifications.
 * Returns an EventSource instance; caller is responsible for closing it.
 */
export function openNotificationStream(
  organizationId?: string,
): EventSource {
  const params = new URLSearchParams();
  if (organizationId) params.set("organization_id", organizationId);
  const url = `${NOTIFICATIONS_BASE_URL}/api/v1/notifications/stream${params.toString() ? `?${params.toString()}` : ""}`;
  return new EventSource(url);
}

/**
 * Opens an SSE stream scoped to a facility code (legacy route).
 */
export function openFacilityNotificationStream(
  facilityCode: string,
): EventSource {
  const url = `${NOTIFICATIONS_BASE_URL}/api/v1/notifications/stream/${encodeURIComponent(facilityCode)}`;
  return new EventSource(url);
}
