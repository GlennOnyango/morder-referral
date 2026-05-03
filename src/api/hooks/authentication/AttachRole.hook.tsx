import { useQuery } from "@tanstack/react-query";
import { attachRoleFromInvite } from "../../authAdmin";
import { useAuthContext } from "../../../context/useAuthContext";

type UseAttachRoleOptions = {
  inviteId: string;
  enabled?: boolean;
};

export const usePostAttachRole = ({ inviteId, enabled = true }: UseAttachRoleOptions) => {
  const { session, refreshSession } = useAuthContext();

  return useQuery({
    queryKey: ["invite", inviteId, "attach-role"],
    queryFn: async () => {
      const response = await attachRoleFromInvite(inviteId, session?.accessToken);
      await refreshSession();
      return response;
    },
    enabled: enabled && inviteId.trim().length > 0,
    staleTime: Infinity,
    retry: false,
  });
};
