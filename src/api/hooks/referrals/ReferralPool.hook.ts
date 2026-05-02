import { useQuery } from "@tanstack/react-query";
import { listReferralPool, type ReferralPoolListQuery } from "../../referrals";
import type { ModelsReferral } from "../../../types/referrals.generated";

export function useReferralPool(
  query: ReferralPoolListQuery | undefined,
  accessToken: string | undefined,
  { enabled = true, staleTime }: { enabled?: boolean; staleTime?: number } = {},
) {
  return useQuery<ModelsReferral[]>({
    queryKey: ["referrals", "pool", query, accessToken],
    queryFn: () => listReferralPool(query, accessToken),
    enabled: enabled && Boolean(accessToken),
    staleTime,
    retry: false,
  });
}
