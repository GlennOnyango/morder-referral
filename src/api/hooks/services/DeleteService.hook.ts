import { useMutation } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { deleteServiceById } from "../../services";

export function useDeleteService(
  accessToken: string | undefined,
  options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">,
) {
  return useMutation<void, Error, string>({
    ...options,
    mutationFn: (serviceId) => deleteServiceById(serviceId, accessToken),
  });
}
