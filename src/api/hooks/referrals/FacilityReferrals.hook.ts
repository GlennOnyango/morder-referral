import { useQuery } from "@tanstack/react-query";
import { listFacilityReferrals, type FacilityReferralListQuery } from "../../referrals";
import type { ModelsReferral } from "../../../types/referrals.generated";

export function useFacilityReferrals(
  facilityCode: string,
  query: FacilityReferralListQuery | undefined,
  accessToken: string | undefined,
  { enabled = true, staleTime }: { enabled?: boolean; staleTime?: number } = {},
) {
  return useQuery<ModelsReferral[]>({
    queryKey: ["referrals", "facility", facilityCode, query, accessToken],
    queryFn: () => listFacilityReferrals(facilityCode, query, accessToken),
    enabled: enabled && Boolean(facilityCode) && Boolean(accessToken),
    staleTime,
  });
}
