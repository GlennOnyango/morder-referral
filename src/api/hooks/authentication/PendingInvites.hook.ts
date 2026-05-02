import { useQuery } from "@tanstack/react-query";
import { listPendingInvites } from "../../authAdmin";
import type { DtoInviteResponse } from "../../../types/auth.generated";

export function usePendingInvites(
  organizationId: string,
  accessToken: string | undefined,
  { enabled = true, staleTime }: { enabled?: boolean; staleTime?: number } = {},
) {
  return useQuery<DtoInviteResponse[]>({
    queryKey: ["invites", "pending", organizationId, accessToken],
    queryFn: () => listPendingInvites(organizationId, accessToken),
    enabled: enabled && Boolean(organizationId),
    staleTime,
  });
}
