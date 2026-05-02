import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { attachRoleFromInvite } from "../../../api/authAdmin";
import { useAcceptInvite } from "../../../api/hooks/authentication/AcceptInvite.hook";
import { useCheckEmail } from "../../../api/hooks/authentication/CheckEmail.hook";
import { getAuthTokens } from "../../../auth";
import Breadcrumbs from "../../../components/Breadcrumbs";
import { useAuthContext } from "../../../context/useAuthContext";

function getAxiosStatus(error: unknown): number | null {
  return axios.isAxiosError(error) ? (error.response?.status ?? null) : null;
}

function extractEmailFromError(error: unknown): string | undefined {
  if (!axios.isAxiosError(error)) return undefined;
  const data = error.response?.data;
  if (!data || typeof data !== "object") return undefined;
  const record = data as Record<string, unknown>;
  for (const key of ["email", "targetEmail", "userEmail"] as const) {
    if (typeof record[key] === "string") return record[key] as string;
  }
  if (record.invite && typeof record.invite === "object") {
    const inv = record.invite as Record<string, unknown>;
    if (typeof inv.targetEmail === "string") return inv.targetEmail;
  }
  return undefined;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "We could not process this invitation.";
}

export default function AcceptInvitePage() {
  const { inviteId = "" } = useParams();
  const { isAuthenticated, refreshSession } = useAuthContext();
  const navigate = useNavigate();

  const [isAttachingRole, setIsAttachingRole] = useState(false);
  const [attachRoleError, setAttachRoleError] = useState<string | null>(null);
  const roleAttachedRef = useRef(false);

  const acceptInviteQuery = useAcceptInvite({ inviteId });

  const inviteErrorStatus = useMemo(
    () =>
      acceptInviteQuery.isError
        ? getAxiosStatus(acceptInviteQuery.error)
        : null,
    [acceptInviteQuery.isError, acceptInviteQuery.error],
  );

  // Email extracted from 409 conflict response
  const conflictEmail = useMemo(
    () =>
      inviteErrorStatus === 409
        ? extractEmailFromError(acceptInviteQuery.error)
        : undefined,
    [inviteErrorStatus, acceptInviteQuery.error],
  );

  // Email from successful invite response for unauthenticated users
  const successEmail = useMemo(
    () =>
      acceptInviteQuery.isSuccess && !isAuthenticated
        ? (acceptInviteQuery.data?.invite?.targetEmail as string | undefined)
        : undefined,
    [acceptInviteQuery.isSuccess, acceptInviteQuery.data, isAuthenticated],
  );

  // Unified target email used for check-email routing
  const targetEmail = conflictEmail ?? successEmail;

  const checkEmailQuery = useCheckEmail({
    email: targetEmail ?? "",
    enabled:
      !!targetEmail &&
      (inviteErrorStatus === 409 ||
        (acceptInviteQuery.isSuccess && !isAuthenticated)),
  });

  // Success + authenticated → attach role, refresh session, then navigate
  useEffect(() => {
    if (!acceptInviteQuery.isSuccess || !isAuthenticated) return;
    if (roleAttachedRef.current) return;
    roleAttachedRef.current = true;

    const attach = async () => {
      setIsAttachingRole(true);
      setAttachRoleError(null);
      try {
        const { accessToken } = await getAuthTokens();
        await attachRoleFromInvite(inviteId, accessToken);
        await refreshSession();
        // /dashboard is a WorkspaceFallback that re-reads activeWorkspaceId after session refresh
        navigate("/dashboard", { replace: true });
      } catch (err) {
        roleAttachedRef.current = false;
        setAttachRoleError(
          err instanceof Error ? err.message : "Failed to attach role.",
        );
      } finally {
        setIsAttachingRole(false);
      }
    };

    void attach();
  }, [
    acceptInviteQuery.isSuccess,
    isAuthenticated,
    inviteId,
    navigate,
    refreshSession,
  ]);

  // Route based on check-email result (handles both 409 conflict and success+unauthenticated)
  useEffect(() => {
    const result = checkEmailQuery.data;
    console.log(result, "", checkEmailQuery);
    if (!result || !targetEmail) return;

    if (!result.exists) {
      const params = new URLSearchParams({ inviteId, email: targetEmail });
      navigate(`/invite/${inviteId}/register?${params.toString()}`, {
        replace: true,
      });
      return;
    }
    if (result.verified) {
      navigate(`/signin?inviteId=${inviteId}`, { replace: true });
    } else {
      const params = new URLSearchParams({ email: targetEmail, inviteId });
      if (result.username) params.set("username", result.username);
      navigate(`/confirm-signup?${params.toString()}`, { replace: true });
    }
  }, [checkEmailQuery.data, targetEmail, inviteId, navigate]);

  return (
    <section className="grid place-items-center mt-3.5 reveal delay-1">
      <article className="w-full max-w-120 rounded-3xl border border-[rgba(10,52,60,0.13)] bg-[rgba(255,255,255,0.82)] p-[clamp(20px,4vw,34px)] shadow-[0_14px_34px_rgba(12,35,40,0.1)]">
        <p className="eyebrow">Invitation</p>
        <h1 className="mt-2.5 font-heading text-[#0d2230] text-[clamp(1.4rem,3.2vw,2rem)] leading-[1.1] tracking-[-0.03em]">
          Accept your facility invite
        </h1>
        <p className="mt-3.5 text-[#506071] text-[0.97rem] leading-[1.55]">
          We're verifying this invitation and connecting it to your account.
        </p>

        <Breadcrumbs className="mt-3.5" items={[{ label: "Invitation" }]} />

        {/* Loading states */}
        {(acceptInviteQuery.isLoading ||
          checkEmailQuery.isLoading ||
          isAttachingRole) && (
          <div className="mt-4.5 rounded-2xl border border-[rgba(10,52,60,0.13)] bg-white/70 p-4">
            <p className="text-[0.95rem] font-semibold text-[#203649]">
              {isAttachingRole
                ? "Attaching your role…"
                : checkEmailQuery.isLoading
                  ? "Checking your account status…"
                  : "Processing invitation..."}
            </p>
          </div>
        )}

        {/* Role attachment error */}
        {attachRoleError && (
          <div className="mt-4.5 rounded-2xl border border-[rgba(180,59,51,0.18)] bg-[rgba(180,59,51,0.06)] p-4">
            <p className="text-[0.95rem] font-semibold text-[#b43b33]">
              {attachRoleError}
            </p>
            <p className="mt-2 text-[0.9rem] text-[#b43b33]/80">
              Ask your administrator to send a new invitation.
            </p>
          </div>
        )}

        {/* Invite errors */}
        {acceptInviteQuery.isError && (
          <>
            {/* 400 — invalid or expired link */}
            {inviteErrorStatus === 400 && (
              <div className="mt-4.5 rounded-2xl border border-[rgba(180,59,51,0.18)] bg-[rgba(180,59,51,0.06)] p-4">
                <p className="text-[0.95rem] font-semibold text-[#b43b33]">
                  This invitation link is invalid.
                </p>
                <p className="mt-2 text-[0.9rem] text-[#b43b33]/80">
                  Ask your administrator to send a new invitation.
                </p>
              </div>
            )}

            {/* 409 — fallback when check-email has no email or itself errored */}
            {inviteErrorStatus === 409 && !checkEmailQuery.isLoading && (
              <div className="mt-4.5 rounded-2xl border border-[rgba(10,52,60,0.13)] bg-white/70 p-4">
                <p className="text-[0.95rem] font-semibold text-[#203649]">
                  An account with this email already exists.
                </p>
                <Link
                  className="mt-2 inline-block text-[0.9rem] text-[#0f5a78] font-semibold hover:underline"
                  to={`/signin?inviteId=${inviteId}`}
                >
                  Sign in to continue
                </Link>
              </div>
            )}

            {/* Other / unknown errors */}
            {inviteErrorStatus !== 400 && inviteErrorStatus !== 409 && (
              <>
                <div className="mt-4.5 rounded-2xl border border-[rgba(10,52,60,0.13)] bg-white/70 p-4">
                  <p className="text-[0.95rem] font-semibold text-[#b43b33]">
                    {getErrorMessage(acceptInviteQuery.error)}
                  </p>
                </div>
                <p className="mt-4 text-[#506071] text-[0.92rem] leading-[1.55]">
                  If the link has expired or was already used, ask your
                  administrator to send a new invitation.
                </p>
              </>
            )}
          </>
        )}
      </article>
    </section>
  );
}
