import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import Breadcrumbs from "../../components/Breadcrumbs";
import { Button } from "../../components/ui/button";
import { attachRoleFromInvite, acceptInvite } from "../../api/authAdmin";
import { useAuthContext } from "../../context/useAuthContext";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "We could not process this invitation.";

const buildAuthPath = (pathname: "/signin" | "/signup", inviteId: string) => {
  const searchParams = new URLSearchParams({ inviteId });
  return `${pathname}?${searchParams.toString()}`;
};

const AcceptInvitePage = () => {
  const { inviteId = "" } = useParams();
  const { isAuthenticated, session, refreshSession, activeWorkspaceId } = useAuthContext();
  const hasAttemptedAttachRef = useRef(false);

  const acceptInviteQuery = useQuery({
    queryKey: ["invite", inviteId, "accept"],
    queryFn: () => acceptInvite(inviteId),
    enabled: inviteId.trim().length > 0,
    retry: false,
  });

  const attachRoleQuery = useQuery({
    queryKey: ["invite", inviteId, "attach-role", session?.accessToken],
    queryFn: async () => {
      const response = await attachRoleFromInvite(inviteId, session?.accessToken);
      await refreshSession();
      return response;
    },
    enabled:
      isAuthenticated &&
      acceptInviteQuery.isSuccess &&
      inviteId.trim().length > 0 &&
      !hasAttemptedAttachRef.current,
    retry: false,
  });

  useEffect(() => {
    if (attachRoleQuery.fetchStatus === "fetching" || attachRoleQuery.status !== "pending") {
      hasAttemptedAttachRef.current = true;
    }
  }, [attachRoleQuery.fetchStatus, attachRoleQuery.status]);

  const isLoading = acceptInviteQuery.isLoading || attachRoleQuery.isLoading;
  const acceptMessage = acceptInviteQuery.data?.message?.trim();
  const attachMessage = attachRoleQuery.data?.message?.trim();
  const primaryMessage =
    attachMessage ||
    acceptMessage ||
    (isAuthenticated
      ? "Your invite has been accepted and your access is being finalised."
      : "Your invite has been accepted. Sign in or create your account to finish setup.");

  const dashboardPath = activeWorkspaceId ? `/${activeWorkspaceId}/dashboard` : "/pending";

  return (
    <section className="grid place-items-center mt-3.5 reveal delay-1">
      <article className="w-full max-w-120 rounded-3xl border border-[rgba(10,52,60,0.13)] bg-[rgba(255,255,255,0.82)] p-[clamp(20px,4vw,34px)] shadow-[0_14px_34px_rgba(12,35,40,0.1)]">
        <p className="eyebrow">Invitation</p>
        <h1 className="mt-2.5 font-heading text-[#0d2230] text-[clamp(1.4rem,3.2vw,2rem)] leading-[1.1] tracking-[-0.03em]">
          Accept your facility invite
        </h1>
        <p className="mt-3.5 text-[#506071] text-[0.97rem] leading-[1.55]">
          We&apos;re verifying this invitation and connecting it to your account.
        </p>

        <Breadcrumbs className="mt-3.5" items={[{ label: "Invitation" }]} />

        <div className="mt-4.5 rounded-2xl border border-[rgba(10,52,60,0.13)] bg-white/70 p-4">
          {isLoading && (
            <p className="text-[0.95rem] font-semibold text-[#203649]">Processing invitation...</p>
          )}

          {acceptInviteQuery.isError && (
            <p className="text-[0.95rem] font-semibold text-[#b43b33]">
              {getErrorMessage(acceptInviteQuery.error)}
            </p>
          )}

          {acceptInviteQuery.isSuccess && attachRoleQuery.isError && (
            <p className="text-[0.95rem] font-semibold text-[#b43b33]">
              {getErrorMessage(attachRoleQuery.error)}
            </p>
          )}

          {acceptInviteQuery.isSuccess && !attachRoleQuery.isError && !isLoading && (
            <p className="text-[0.95rem] font-semibold text-[#0f5f52]">{primaryMessage}</p>
          )}
        </div>

        {acceptInviteQuery.isSuccess && !isLoading && (
          <div className="mt-4 grid gap-3">
            {isAuthenticated ? (
              <Button asChild size="lg" className="w-full">
                <Link to={dashboardPath}>Continue to workspace</Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="w-full">
                  <Link to={buildAuthPath("/signin", inviteId)}>Sign in to continue</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full">
                  <Link to={buildAuthPath("/signup", inviteId)}>Create account</Link>
                </Button>
              </>
            )}
          </div>
        )}

        {(acceptInviteQuery.isError || attachRoleQuery.isError) && (
          <p className="mt-4 text-[#506071] text-[0.92rem] leading-[1.55]">
            If the link has expired or was already used, ask your administrator to send a new invitation.
          </p>
        )}
      </article>
    </section>
  );
};

export default AcceptInvitePage;
