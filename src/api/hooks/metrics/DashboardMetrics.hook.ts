import { useQuery } from "@tanstack/react-query";
import { fetchDashboardMetrics, type DashboardMetrics } from "../../metrics";

export function useGetDashboardMetrics(
  accessToken: string | undefined,
  { enabled = true, staleTime }: { enabled?: boolean; staleTime?: number } = {},
) {
  return useQuery<DashboardMetrics>({
    queryKey: ["metrics", "dashboard", accessToken],
    queryFn: () => fetchDashboardMetrics(accessToken),
    enabled,
    staleTime,
  });
}
