import { useMutation } from "@tanstack/react-query";
import { createServiceRequest } from "../../serviceRequests";
import type { ServiceRequestCreateInput } from "../../serviceRequests";
import type { ModelServiceRequest } from "../../../types/organizations.generated";

export function useCreateServiceRequest(
  accessToken: string | undefined,
  options?: {
    onSuccess?: (data: ModelServiceRequest) => void;
    onError?: (err: unknown) => void;
  },
) {
  return useMutation<ModelServiceRequest, unknown, ServiceRequestCreateInput>({
    mutationFn: (payload) => createServiceRequest(payload, accessToken),
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}
