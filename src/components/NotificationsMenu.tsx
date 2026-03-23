import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listOrganizations } from "../api/organizations";
import { listNotifications, markNotificationAsRead } from "../api/referrals";
import { useAuthContext } from "../context/AuthContext";
import type { ModelsNotification } from "../types/referrals.generated";
import { isOrganizationOwnedBySessionFacility } from "../utils/facilityAccess";

type NotificationFacilityContext = {
  facilityId: string;
  facilityCode: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function formatDateTime(value?: string): string {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function formatEventType(value?: string): string {
  if (!value) {
    return "Notification";
  }

  return value
    .split(/[._-]+/)
    .filter((part) => part.length > 0)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

function extractPayloadMessage(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  const candidates = ["message", "description", "reason", "detail"] as const;
  for (const key of candidates) {
    const value = payload[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function getNotificationSummary(notification: ModelsNotification): string {
  const payloadMessage = extractPayloadMessage(notification.payload);
  if (payloadMessage) {
    return payloadMessage;
  }

  if (notification.referralCode) {
    return `Referral ${notification.referralCode}`;
  }

  if (notification.targetFacilityCode) {
    return `Facility ${notification.targetFacilityCode}`;
  }

  return "Referral workflow update";
}

function NotificationsMenu() {
  const { isAuthenticated, session } = useAuthContext();
  const role = session?.role;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const isHospitalAdmin = role === "HOSPITAL_ADMIN";

  const facilityContextQuery = useQuery({
    queryKey: ["notifications", "facility-context", session?.accessToken, session?.facilityId],
    queryFn: async (): Promise<NotificationFacilityContext | null> => {
      const organizations = await listOrganizations(session?.accessToken);
      const assignedFacility =
        organizations.find((organization) =>
          isOrganizationOwnedBySessionFacility(organization, session?.facilityId),
        ) ?? null;

      const facilityId = assignedFacility?.id?.trim() ?? "";
      const facilityCode = assignedFacility?.facility_code?.trim() ?? "";
      if (!facilityId || !facilityCode) {
        return null;
      }

      return {
        facilityId,
        facilityCode,
      };
    },
    enabled: isAuthenticated && isHospitalAdmin && Boolean(session?.facilityId),
    staleTime: 2 * 60 * 1000,
  });

  const notificationFacilityCode = facilityContextQuery.data?.facilityCode;
  const notificationFacilityId = facilityContextQuery.data?.facilityId;
  const notificationQueryKey = ["referral-notifications", notificationFacilityCode, session?.accessToken];

  const notificationsQuery = useQuery({
    queryKey: notificationQueryKey,
    queryFn: () =>
      listNotifications(
        {
          facilityCode: notificationFacilityCode,
          limit: 20,
          offset: 0,
        },
        session?.accessToken,
      ),
    enabled:
      isAuthenticated &&
      Boolean(session?.accessToken) &&
      (!isHospitalAdmin || Boolean(notificationFacilityCode)),
    refetchInterval: 20 * 1000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      markNotificationAsRead(
        notificationId,
        { facilityCode: notificationFacilityCode },
        session?.accessToken,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationQueryKey });
    },
  });

  const notifications = useMemo(
    () =>
      [...(notificationsQuery.data ?? [])].sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      }),
    [notificationsQuery.data],
  );

  const unreadCount = notifications.reduce((count, notification) => {
    if (notification.isRead) {
      return count;
    }
    return count + 1;
  }, 0);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleDocumentClick = (event: MouseEvent) => {
      if (!shellRef.current) {
        return;
      }

      const targetNode = event.target;
      if (targetNode instanceof Node && !shellRef.current.contains(targetNode)) {
        setIsOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", handleDocumentClick);
    window.addEventListener("keydown", handleEscapeKey);
    return () => {
      window.removeEventListener("mousedown", handleDocumentClick);
      window.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen]);

  if (!isAuthenticated) {
    return null;
  }

  const openNotification = (notification: ModelsNotification) => {
    if (notification.id && !notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }

    const referralCode = notification.referralCode?.trim() ?? "";
    if (referralCode && notificationFacilityId) {
      navigate(`/facilities/${notificationFacilityId}/referrals/pool/${encodeURIComponent(referralCode)}`);
    } else if (notificationFacilityId) {
      navigate(`/facilities/${notificationFacilityId}/referrals`);
    } else {
      navigate("/dashboard");
    }

    setIsOpen(false);
  };

  const hasNotifications = notifications.length > 0;

  return (
    <div className="notifications-shell" ref={shellRef}>
      <button
        type="button"
        className="btn btn-ghost notifications-toggle"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span aria-hidden="true">Notifications</span>
        {unreadCount > 0 ? <span className="notifications-badge">{unreadCount}</span> : null}
      </button>

      {isOpen ? (
        <section className="notifications-panel" role="dialog" aria-label="Notifications">
          <div className="notifications-panel-header">
            <h2>Notifications</h2>
            <button
              type="button"
              className="btn btn-ghost notifications-refresh-btn"
              onClick={() => {
                void notificationsQuery.refetch();
              }}
              disabled={notificationsQuery.isFetching}
            >
              {notificationsQuery.isFetching ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {isHospitalAdmin && !notificationFacilityCode && !facilityContextQuery.isLoading ? (
            <p className="notifications-empty">
              Could not resolve your facility code for notifications.
            </p>
          ) : null}

          {notificationsQuery.isLoading ? <p className="notifications-empty">Loading notifications...</p> : null}
          {notificationsQuery.isError ? (
            <p className="result-note error-note">Could not load notifications.</p>
          ) : null}

          {!notificationsQuery.isLoading && !notificationsQuery.isError ? (
            hasNotifications ? (
              <ul className="notifications-list">
                {notifications.map((notification) => (
                  <li key={notification.id ?? `${notification.eventType ?? "event"}-${notification.createdAt ?? ""}`}>
                    <button
                      type="button"
                      className={`notification-item${notification.isRead ? "" : " unread"}`}
                      onClick={() => openNotification(notification)}
                    >
                      <span className="notification-title">{formatEventType(notification.eventType)}</span>
                      <span className="notification-message">{getNotificationSummary(notification)}</span>
                      <span className="notification-meta">{formatDateTime(notification.createdAt)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="notifications-empty">No notifications yet.</p>
            )
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

export default NotificationsMenu;
