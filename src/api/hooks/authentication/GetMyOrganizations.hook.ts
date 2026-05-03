import { useQuery } from "@tanstack/react-query";
import { listUserOrganizations } from "../../authAdmin";
import type { DtoUserOrganizationMappingResponse } from "../../../types/auth.generated";

export function useGetMyOrganizations(
  accessToken: string | undefined,
  { enabled = true, staleTime }: { enabled?: boolean; staleTime?: number } = {},
) {
  return useQuery<DtoUserOrganizationMappingResponse[]>({
    queryKey: ["my-organizations", accessToken],
    queryFn: () => listUserOrganizations(accessToken),
    enabled: enabled && Boolean(accessToken),
    staleTime,
  });
}
