import { useQuery } from "@tanstack/react-query";
import { checkEmail } from "../../authAdmin";
import type { CheckEmailResult } from "../../authAdmin";

type UseCheckEmailOptions = {
  email: string;
  enabled?: boolean;
};

export type UseCheckEmailResult = ReturnType<typeof useCheckEmail>;

export const useCheckEmail = ({ email, enabled = true }: UseCheckEmailOptions) => {
  return useQuery<CheckEmailResult>({
    queryKey: ["check-email", email.trim()],
    queryFn: () => checkEmail(email),
    enabled: enabled && email.trim().length > 0,
    staleTime: Infinity,
    retry: false,
  });
};
