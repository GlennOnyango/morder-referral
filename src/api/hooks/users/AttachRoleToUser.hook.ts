import { useMutation } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { attachRoleToUser, type AuthGroupName } from "../../authAdmin";

type AttachRoleVariables = { username: string; groupName: AuthGroupName };

export function usePostAttachRoleToUser(
  accessToken: string | undefined,
  options?: Omit<UseMutationOptions<unknown, Error, AttachRoleVariables>, "mutationFn">,
) {
  return useMutation<unknown, Error, AttachRoleVariables>({
    ...options,
    mutationFn: (input) => attachRoleToUser(input, accessToken),
  });
}
