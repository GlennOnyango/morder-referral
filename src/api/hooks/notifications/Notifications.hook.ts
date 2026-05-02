import { useQuery } from "@tanstack/react-query";
import { listNotifications, type NotificationListQuery } from "../../notifications";
import type { GithubComVaudKKNrsNotificationsInternalModelsNotification as Notification } from "../../../types/notifications.generated";

export function useNotifications(
  query: NotificationListQuery | undefined,
  accessToken: string | undefined,
  { enabled = true, staleTime, refetchInterval }: { enabled?: boolean; staleTime?: number; refetchInterval?: number } = {},
) {
  return useQuery<Notification[]>({
    queryKey: ["notifications", "list", query, accessToken],
    queryFn: () => listNotifications(query, accessToken),
    enabled,
    staleTime,
    refetchInterval,
  });
}
