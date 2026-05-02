import { useMutation } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { markNotificationAsRead, type NotificationReadQuery } from "../../notifications";
import type { GithubComVaudKKNrsNotificationsInternalModelsNotification as Notification } from "../../../types/notifications.generated";

type MarkReadVariables = { id: string; query?: NotificationReadQuery };

export function useMarkNotificationRead(
  accessToken: string | undefined,
  options?: Omit<UseMutationOptions<Notification, Error, MarkReadVariables>, "mutationFn">,
) {
  return useMutation<Notification, Error, MarkReadVariables>({
    ...options,
    mutationFn: ({ id, query }) => markNotificationAsRead(id, query, accessToken),
  });
}
