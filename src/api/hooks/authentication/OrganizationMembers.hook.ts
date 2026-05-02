import { useQuery } from "@tanstack/react-query";
import { listOrganizationMembers } from "../../authAdmin";
import type { DtoUserOrganizationMappingResponse } from "../../../types/auth.generated";

export function useOrganizationMembers(
  organizationId: string,
  accessToken: string | undefined,
  { enabled = true, staleTime }: { enabled?: boolean; staleTime?: number } = {},
) {
  return useQuery<DtoUserOrganizationMappingResponse[]>({
    queryKey: ["members", "organization", organizationId, accessToken],
    queryFn: () => listOrganizationMembers(organizationId, accessToken),
    enabled: enabled && Boolean(organizationId),
    staleTime,
  });
}
