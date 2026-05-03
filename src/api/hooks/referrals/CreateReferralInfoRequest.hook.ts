import { useMutation } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { createReferralInformationRequest, type CreateReferralInformationRequestInput } from "../../referrals";
import type { ModelsAdditionalInformationRequest } from "../../../types/referrals.generated";

type CreateInfoRequestVariables = {
  referralId: string;
  payload: CreateReferralInformationRequestInput;
};

export function usePostReferralInfoRequest(
  accessToken: string | undefined,
  options?: Omit<
    UseMutationOptions<ModelsAdditionalInformationRequest, Error, CreateInfoRequestVariables>,
    "mutationFn"
  >,
) {
  return useMutation<ModelsAdditionalInformationRequest, Error, CreateInfoRequestVariables>({
    ...options,
    mutationFn: ({ referralId, payload }) =>
      createReferralInformationRequest(referralId, payload, accessToken),
  });
}
