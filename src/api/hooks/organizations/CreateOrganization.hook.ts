import { useMutation } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { createOrganization, type OrganizationCreateInput } from "../../organizations";
import type { ModelOrganization } from "../../../types/organizations.generated";

export function useCreateOrganization(
  accessToken: string | undefined,
  options?: Omit<UseMutationOptions<ModelOrganization, Error, OrganizationCreateInput>, "mutationFn">,
) {
  return useMutation<ModelOrganization, Error, OrganizationCreateInput>({
    ...options,
    mutationFn: (payload) => createOrganization(payload, accessToken),
  });
}
