import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listOrganizations } from "../../api/organizations";
import { listNotifications, markNotificationAsRead } from "../../api/referrals";
import Breadcrumbs from "../../components/Breadcrumbs";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useAuthContext } from "../../context/useAuthContext";
import type { ModelsNotification } from "../../types/referrals.generated";
import { isOrganizationOwnedBySessionFacility } from "../../utils/facilityAccess";

const PAGE_SIZE = 10;

type NotificationFacilityContext = {
  facilityId: string;
  facilityCode: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const formatDateTime = (value?: string): string => {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
};

const formatEventType = (value?: string): string => {
  if (!value) return "Notification";
  return value
    .split(/[._-]+/)
    .filter((p) => p.length > 0)
    .map((p) => `${p[0]?.toUpperCase() ?? ""}${p.slice(1).toLowerCase()}`)
    .join(" ");
};

const extractPayloadMessage = (payload: unknown): string | null => {
  if (!isRecord(payload)) return null;
  for (const key of ["message", "description", "reason", "detail"] as const) {
    const v = payload[key];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return null;
};

const getNotificationSummary = (n: ModelsNotification): string =>
  extractPayloadMessage(n.payload) ??
  (n.referralCode ? `Referral ${n.referralCode}` : null) ??
  (n.targetFacilityCode ? `Facility ${n.targetFacilityCode}` : null) ??
  "Referral workflow update";

function NotificationsPage() {
  const { isAuthenticated, session } = useAuthContext();
  const role = session?.role;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isHospitalAdmin = role === "HOSPITAL_ADMIN";

  const [page, setPage] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const facilityContextQuery = useQuery({
    queryKey: ["notifications", "facility-context", session?.accessToken, session?.facilityId],
    queryFn: async (): Promise<NotificationFacilityContext | null> => {
      const orgs = await listOrganizations(session?.accessToken);
      const facility =
        orgs.find((o) => isOrganizationOwnedBySessionFacility(o, session?.facilityId)) ?? null;
      const facilityId = facility?.id?.trim() ?? "";
      const facilityCode = facility?.facility_code?.trim() ?? "";
      return facilityId && facilityCode ? { facilityId, facilityCode } : null;
    },
    enabled: isAuthenticated && isHospitalAdmin && Boolean(session?.facilityId),
    staleTime: 2 * 60 * 1000,
  });

  const facilityCode = facilityContextQuery.data?.facilityCode;
  const facilityId = facilityContextQuery.data?.facilityId;

  const notificationQueryKey = [
    "notifications-page",
    facilityCode,
    session?.accessToken,
    page,
    unreadOnly,
  ];

  const notificationsQuery = useQuery({
    queryKey: notificationQueryKey,
    queryFn: () =>
      listNotifications(
        {
          facilityCode,
          unreadOnly,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        },
        session?.accessToken,
      ),
    enabled:
      isAuthenticated &&
      Boolean(session?.accessToken) &&
      (!isHospitalAdmin || Boolean(facilityCode)),
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) =>
      markNotificationAsRead(id, { facilityCode }, session?.accessToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications-page"] });
      await queryClient.invalidateQueries({ queryKey: ["referral-notifications"] });
    },
  });

  const notifications = useMemo(
    () =>
      [...(notificationsQuery.data ?? [])].sort((a, b) => {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
      }),
    [notificationsQuery.data],
  );

  const hasNextPage = notifications.length === PAGE_SIZE;
  const hasPrevPage = page > 0;

  const openNotification = (n: ModelsNotification) => {
    if (n.id && !n.isRead) markAsReadMutation.mutate(n.id);
    const code = n.referralCode?.trim() ?? "";
    if (code && facilityId) {
      navigate(`/facilities/${facilityId}/referrals/pool/${encodeURIComponent(code)}`);
    } else if (facilityId) {
      navigate(`/facilities/${facilityId}/referrals`);
    } else {
      navigate("/dashboard");
    }
  };

  const handleToggleUnreadOnly = () => {
    setPage(0);
    setUnreadOnly((prev) => !prev);
  };

  return (
    <div className="org-page">
      <Breadcrumbs items={[{ label: "Home", to: "/dashboard" }, { label: "Notifications" }]} />

      <div className="org-page-header">
        <h1 className="org-page-title">Notifications</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={unreadOnly ? "default" : "outline"}
            size="sm"
            onClick={handleToggleUnreadOnly}
          >
            {unreadOnly ? "Unread only" : "All notifications"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={notificationsQuery.isFetching}
            onClick={() => void notificationsQuery.refetch()}
          >
            {notificationsQuery.isFetching ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      {isHospitalAdmin && !facilityCode && !facilityContextQuery.isLoading && (
        <p className="text-sm text-slate-500">
          Could not resolve your facility code for notifications.
        </p>
      )}

      {notificationsQuery.isLoading && (
        <p className="text-sm text-slate-500">Loading notifications…</p>
      )}

      {notificationsQuery.isError && (
        <p className="text-[0.85rem] font-semibold text-[#b43b33]">
          Could not load notifications.
        </p>
      )}

      {!notificationsQuery.isLoading && !notificationsQuery.isError && (
        <>
          {notifications.length > 0 ? (
            <ul className="grid list-none gap-3 p-0">
              {notifications.map((n) => (
                <li key={n.id ?? `${n.eventType ?? "event"}-${n.createdAt ?? ""}`}>
                  <Card className={`overflow-hidden border-2 ${n.isRead ? "border-slate-200" : "border-sky-700/35"}`}>
                    <button
                      type="button"
                      className={`grid w-full cursor-pointer gap-2 p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-sky-700/50 ${
                        n.isRead
                          ? "bg-white hover:bg-slate-50"
                          : "bg-linear-to-b from-white to-sky-50/70 hover:bg-white/70"
                      }`}
                      onClick={() => openNotification(n)}
                    >
                      <span className="flex w-full items-center justify-between gap-2">
                        <span className="text-sm font-extrabold text-slate-800">
                          {formatEventType(n.eventType)}
                        </span>
                        {!n.isRead && (
                          <span className="rounded-full border border-sky-700/25 bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800">
                            Unread
                          </span>
                        )}
                      </span>
                      <span className="text-sm leading-5 text-slate-700">
                        {getNotificationSummary(n)}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {formatDateTime(n.createdAt)}
                      </span>
                    </button>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">
              {unreadOnly ? "No unread notifications." : "No notifications found."}
            </p>
          )}

          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPrevPage || notificationsQuery.isFetching}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-slate-500">Page {page + 1}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNextPage || notificationsQuery.isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default NotificationsPage;
