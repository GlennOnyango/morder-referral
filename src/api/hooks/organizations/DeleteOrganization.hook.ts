import { useMutation } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { deleteOrganization } from "../../organizations";

export function useDeleteOrganization(
  accessToken: string | undefined,
  options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">,
) {
  return useMutation<void, Error, string>({
    ...options,
    mutationFn: (id) => deleteOrganization(id, accessToken),
  });
}
