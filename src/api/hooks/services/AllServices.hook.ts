import { useQuery } from "@tanstack/react-query";
import { listAllServices } from "../../services";
import type { ModelService } from "../../../types/organizations.generated";

export function useGetAllServices(
  accessToken: string | undefined,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery<ModelService[]>({
    queryKey: ["services", "all"],
    queryFn: () => listAllServices(accessToken),
    enabled,
  });
}
