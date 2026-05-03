import { useMutation } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { createOrganizationService, type ServiceUpsertInput } from "../../services";
import type { ModelService } from "../../../types/organizations.generated";

type CreateServiceVariables = { organizationId: string; payload: ServiceUpsertInput };

export function usePostOrganizationService(
  accessToken: string | undefined,
  options?: Omit<UseMutationOptions<ModelService, Error, CreateServiceVariables>, "mutationFn">,
) {
  return useMutation<ModelService, Error, CreateServiceVariables>({
    ...options,
    mutationFn: ({ organizationId, payload }) =>
      createOrganizationService(organizationId, payload, accessToken),
  });
}
