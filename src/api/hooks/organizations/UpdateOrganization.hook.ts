import { useMutation } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { updateOrganization, type OrganizationUpdateInput } from "../../organizations";
import type { ModelOrganization } from "../../../types/organizations.generated";

type UpdateOrganizationVariables = { id: string; payload: OrganizationUpdateInput };

export function usePutOrganization(
  accessToken: string | undefined,
  options?: Omit<UseMutationOptions<ModelOrganization, Error, UpdateOrganizationVariables>, "mutationFn">,
) {
  return useMutation<ModelOrganization, Error, UpdateOrganizationVariables>({
    ...options,
    mutationFn: ({ id, payload }) => updateOrganization(id, payload, accessToken),
  });
}
