import { useQuery } from "@tanstack/react-query";
import { listOrganizations } from "../../organizations";
import type { ModelOrganization } from "../../../types/organizations.generated";

export function useOrganizations(
  accessToken: string | undefined,
  { enabled = true, staleTime }: { enabled?: boolean; staleTime?: number } = {},
) {
  return useQuery<ModelOrganization[]>({
    queryKey: ["organizations", "list", accessToken],
    queryFn: () => listOrganizations(accessToken),
    enabled,
    staleTime,
  });
}
