import { useMutation } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { createInvite } from "../../authAdmin";
import type { DtoCreateInviteRequest, DtoInviteResponse } from "../../../types/auth.generated";

export function usePostInvite(
  accessToken: string | undefined,
  options?: Omit<UseMutationOptions<DtoInviteResponse, Error, DtoCreateInviteRequest>, "mutationFn">,
) {
  return useMutation<DtoInviteResponse, Error, DtoCreateInviteRequest>({
    ...options,
    mutationFn: (payload) => createInvite(payload, accessToken),
  });
}
