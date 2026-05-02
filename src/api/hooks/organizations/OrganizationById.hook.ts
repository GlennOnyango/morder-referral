import { useQuery } from "@tanstack/react-query";
import { getOrganizationById } from "../../organizations";
import type { ModelOrganization } from "../../../types/organizations.generated";

export function useOrganizationById(
  organizationId: string,
  accessToken: string | undefined,
  { enabled = true, staleTime }: { enabled?: boolean; staleTime?: number } = {},
) {
  return useQuery<ModelOrganization>({
    queryKey: ["organizations", "detail", organizationId, accessToken],
    queryFn: () => getOrganizationById(organizationId, accessToken),
    enabled: enabled && Boolean(organizationId),
    staleTime,
  });
}
