import { useQuery } from "@tanstack/react-query";
import { listOrganizationServices } from "../../services";
import type { ModelService } from "../../../types/organizations.generated";

export function useOrganizationServices(
  organizationId: string,
  accessToken: string | undefined,
  { enabled = true, staleTime }: { enabled?: boolean; staleTime?: number } = {},
) {
  return useQuery<ModelService[]>({
    queryKey: ["services", "list", organizationId, accessToken],
    queryFn: () => listOrganizationServices(organizationId, accessToken),
    enabled: enabled && Boolean(organizationId),
    staleTime,
  });
}
