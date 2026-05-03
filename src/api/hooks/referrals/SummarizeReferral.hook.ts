import { useMutation } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { streamReferralSummaryByCode, type ReferralSummaryChunkHandler } from "../../referrals";

type SummarizeVariables = { referralCode: string; onChunk: ReferralSummaryChunkHandler };

export function usePostSummarizeReferral(
  accessToken: string | undefined,
  options?: Omit<UseMutationOptions<string, Error, SummarizeVariables>, "mutationFn">,
) {
  return useMutation<string, Error, SummarizeVariables>({
    ...options,
    mutationFn: ({ referralCode, onChunk }) =>
      streamReferralSummaryByCode(referralCode, onChunk, accessToken),
  });
}
