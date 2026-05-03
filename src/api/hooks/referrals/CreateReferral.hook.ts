import { useMutation } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { createReferral, type ReferralCreateInput } from "../../referrals";
import type { ModelsReferral } from "../../../types/referrals.generated";

export function usePostReferral(
  accessToken: string | undefined,
  options?: Omit<UseMutationOptions<ModelsReferral, Error, ReferralCreateInput>, "mutationFn">,
) {
  return useMutation<ModelsReferral, Error, ReferralCreateInput>({
    ...options,
    mutationFn: (payload) => createReferral(payload, accessToken),
  });
}
