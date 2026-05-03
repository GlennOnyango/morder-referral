import { useQuery } from "@tanstack/react-query";
import { listFacilityServicesByCode } from "../../services";
import type { ModelService } from "../../../types/organizations.generated";

export function useGetFacilityServices(
  facilityCode: string | undefined,
  accessToken: string | undefined,
  { enabled = true, staleTime }: { enabled?: boolean; staleTime?: number } = {},
) {
  return useQuery<ModelService[]>({
    queryKey: ["services", "facility", facilityCode, accessToken],
    queryFn: () => listFacilityServicesByCode(facilityCode!, accessToken),
    enabled: enabled && Boolean(facilityCode),
    staleTime,
  });
}
