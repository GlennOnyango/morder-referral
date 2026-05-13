import { useQuery } from "@tanstack/react-query";
import { listOutgoingServiceRequests } from "../../serviceRequests";
import type { ModelServiceRequest } from "../../../types/organizations.generated";

export function useGetOutgoingServiceRequests(
  organizationId: string,
  accessToken: string | undefined,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery<ModelServiceRequest[]>({
    queryKey: ["service-requests", "outgoing", organizationId],
    queryFn: () => listOutgoingServiceRequests(organizationId, accessToken),
    enabled: enabled && Boolean(organizationId),
  });
}
