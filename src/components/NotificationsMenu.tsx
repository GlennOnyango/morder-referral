import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell01Icon } from "@untitledui/icons-react/outline";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { listOrganizations } from "../api/organizations";
import { listNotifications, markNotificationAsRead } from "../api/referrals";
import { useAuthContext } from "../context/AuthContext";
import type { ModelsNotification } from "../types/referrals.generated";
import { isOrganizationOwnedBySessionFacility } from "../utils/facilityAccess";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Popover, PopoverClose, PopoverContent, PopoverTitle, PopoverTrigger } from "./ui/popover";

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

const NotificationsMenu = () => {
  const { isAuthenticated, session } = useAuthContext();
  const role = session?.role;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isHospitalAdmin = role === "HOSPITAL_ADMIN";

  const facilityContextQuery = useQuery({
    queryKey: ["notifications", "facility-context", session?.accessToken, session?.facilityId],
    queryFn: async (): Promise<NotificationFacilityContext | null> => {
      const orgs = await listOrganizations(session?.accessToken);
      const facility = orgs.find((o) => isOrganizationOwnedBySessionFacility(o, session?.facilityId)) ?? null;
      const facilityId = facility?.id?.trim() ?? "";
      const facilityCode = facility?.facility_code?.trim() ?? "";
      return facilityId && facilityCode ? { facilityId, facilityCode } : null;
    },
    enabled: isAuthenticated && isHospitalAdmin && Boolean(session?.facilityId),
    staleTime: 2 * 60 * 1000,
  });

  const facilityCode = facilityContextQuery.data?.facilityCode;
  const facilityId = facilityContextQuery.data?.facilityId;
  const notificationQueryKey = ["referral-notifications", facilityCode, session?.accessToken];

  const notificationsQuery = useQuery({
    queryKey: notificationQueryKey,
    queryFn: () =>
      listNotifications(
        { facilityCode, unreadOnly: true, limit: 20, offset: 0 },
        session?.accessToken,
      ),
    enabled:
      isAuthenticated &&
      Boolean(session?.accessToken) &&
      (!isHospitalAdmin || Boolean(facilityCode)),
    refetchInterval: 20 * 1000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) =>
      markNotificationAsRead(id, { facilityCode }, session?.accessToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationQueryKey });
    },
  });

  const notifications = useMemo(
    () =>
      [...(notificationsQuery.data ?? [])]
        .filter((n) => !n.isRead)
        .sort((a, b) => {
          const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tB - tA;
        }),
    [notificationsQuery.data],
  );

  const unreadCount = notifications.length;

  if (!isAuthenticated) return null;

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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
          aria-haspopup="dialog"
          className="relative size-10 rounded-full border border-slate-700/20 bg-white/80"
        >
          <Bell01Icon aria-hidden="true" className="size-5 text-slate-900" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 inline-grid h-5 min-w-5 place-items-center rounded-full bg-sky-700 px-1 text-[11px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="center" className="w-100">
        <div className="flex items-center justify-between gap-3">
          <PopoverTitle>Notifications</PopoverTitle>
          <Button
            variant="ghost"
            size="sm"
            disabled={notificationsQuery.isFetching}
            onClick={() => void notificationsQuery.refetch()}
          >
            {notificationsQuery.isFetching ? "Refreshing…" : "Refresh"}
          </Button>
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
          notifications.length > 0 ? (
            <ul className="grid max-h-80 list-none gap-2 overflow-y-auto p-0">
              {notifications.map((n) => (
                <li key={n.id ?? `${n.eventType ?? "event"}-${n.createdAt ?? ""}`}>
                  <Card className="overflow-hidden border-2 border-sky-700/35">
                    <PopoverClose asChild>
                      <button
                        type="button"
                        className="grid w-full cursor-pointer gap-2 bg-linear-to-b from-white to-sky-50/70 p-3 text-left transition-colors hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-sky-700/50"
                        onClick={() => openNotification(n)}
                      >
                        <span className="flex w-full items-center justify-between gap-2">
                          <span className="text-sm font-extrabold text-slate-800">
                            {formatEventType(n.eventType)}
                          </span>
                          <span className="rounded-full border border-sky-700/25 bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800">
                            Unread
                          </span>
                        </span>
                        <span className="text-sm leading-5 text-slate-700">
                          {getNotificationSummary(n)}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {formatDateTime(n.createdAt)}
                        </span>
                      </button>
                    </PopoverClose>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No unread notifications.</p>
          )
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsMenu;
