import { useQuery } from "@tanstack/react-query";
import { getReferralHistoryByCode } from "../../referrals";
import type { ModelsReferralHistory } from "../../../types/referrals.generated";

export function useGetReferralHistory(
  referralCode: string,
  accessToken: string | undefined,
  { enabled = true, staleTime }: { enabled?: boolean; staleTime?: number } = {},
) {
  return useQuery<ModelsReferralHistory[]>({
    queryKey: ["referrals", "history", referralCode, accessToken],
    queryFn: () => getReferralHistoryByCode(referralCode, accessToken),
    enabled: enabled && Boolean(referralCode),
    staleTime,
  });
}
