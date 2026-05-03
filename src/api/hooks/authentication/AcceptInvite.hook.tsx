import { useQuery } from "@tanstack/react-query";
import { acceptInvite } from "../../authAdmin";
import type { DtoAcceptInviteResponse } from "../../../types/auth.generated";

type UseAcceptInviteOptions = {
  inviteId: string;
};

export type UseAcceptInviteResult = ReturnType<typeof useGetAcceptInvite>;

export const useGetAcceptInvite = ({ inviteId }: UseAcceptInviteOptions) => {
  return useQuery<DtoAcceptInviteResponse>({
    queryKey: ["invite", inviteId, "accept"],
    queryFn: () => acceptInvite(inviteId),
    enabled: inviteId.trim().length > 0,
    retry: false,
  });
};
