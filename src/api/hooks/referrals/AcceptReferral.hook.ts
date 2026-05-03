import { useMutation } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { acceptReferralByCode } from "../../referrals";
import type { ServiceAcceptReferralInput, ModelsReferral } from "../../../types/referrals.generated";

type AcceptReferralVariables = { referralCode: string; payload: ServiceAcceptReferralInput };

export function usePostAcceptReferral(
  accessToken: string | undefined,
  options?: Omit<UseMutationOptions<ModelsReferral, Error, AcceptReferralVariables>, "mutationFn">,
) {
  return useMutation<ModelsReferral, Error, AcceptReferralVariables>({
    ...options,
    mutationFn: ({ referralCode, payload }) =>
      acceptReferralByCode(referralCode, payload, accessToken),
  });
}
