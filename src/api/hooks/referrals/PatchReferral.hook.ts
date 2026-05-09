import { useMutation } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { patchReferral, type ReferralUpdateInput } from "../../referrals";
import type { ModelsReferral } from "../../../types/referrals.generated";

type PatchReferralVariables = { referralCode: string; payload: ReferralUpdateInput };

export function usePatchReferral(
  accessToken: string | undefined,
  options?: Omit<UseMutationOptions<ModelsReferral, Error, PatchReferralVariables>, "mutationFn">,
) {
  return useMutation<ModelsReferral, Error, PatchReferralVariables>({
    ...options,
    mutationFn: ({ referralCode, payload }) => patchReferral(referralCode, payload, accessToken),
  });
}
