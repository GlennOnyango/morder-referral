import { useQuery } from "@tanstack/react-query";
import { getReferralByCode } from "../../referrals";
import type { ModelsReferral } from "../../../types/referrals.generated";

export function useGetReferralByCode(
  referralCode: string,
  accessToken: string | undefined,
  { enabled = true, staleTime }: { enabled?: boolean; staleTime?: number } = {},
) {
  return useQuery<ModelsReferral>({
    queryKey: ["referrals", "detail", referralCode, accessToken],
    queryFn: () => getReferralByCode(referralCode, accessToken),
    enabled: enabled && Boolean(referralCode),
    staleTime,
  });
}
