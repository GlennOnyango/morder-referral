import { useMutation } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { updateServiceById } from "../../services";
import type { ApiUpdateServiceRequest, ModelService } from "../../../types/organizations.generated";

type UpdateServiceVariables = { serviceId: string; payload: ApiUpdateServiceRequest };

export function usePutService(
  accessToken: string | undefined,
  options?: Omit<UseMutationOptions<ModelService, Error, UpdateServiceVariables>, "mutationFn">,
) {
  return useMutation<ModelService, Error, UpdateServiceVariables>({
    ...options,
    mutationFn: ({ serviceId, payload }) => updateServiceById(serviceId, payload, accessToken),
  });
}
