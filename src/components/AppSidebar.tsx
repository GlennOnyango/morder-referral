import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Activity,
  Building2,
  ShieldCheck,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Stethoscope,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "../context/useAuthContext";
import { getOrganizationById } from "../api/organizations";
import type { AppRole } from "../context/authTypes";

type NavItem = {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  allowedRoles?: AppRole[];
  end?: boolean;
  getPath: (workspaceId: string, isSuperAdmin: boolean) => string;
  showWhen?: (opts: { isFacilityOrg: boolean }) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    end: true,
    getPath: (w) => `/${w}/dashboard`,
  },
  {
    label: "Referrals",
    icon: ArrowLeftRight,
    allowedRoles: ["HOSPITAL_ADMIN", "SUPER_ADMIN"],
    end: false,
    getPath: (w) => `/${w}/referrals`,
  },
  {
    label: "Services",
    icon: Activity,
    allowedRoles: ["SERVICE_ADMIN", "SUPER_ADMIN"],
    end: false,
    getPath: (w) => `/${w}/services`,
  },
  {
    label: "Facility Service",
    icon: Stethoscope,
    allowedRoles: ["HOSPITAL_ADMIN", "SUPER_ADMIN"],
    end: false,
    getPath: (w) => `/${w}/facility-services`,
    showWhen: ({ isFacilityOrg }) => isFacilityOrg,
  },
  {
    label: "Organization",
    icon: Building2,
    allowedRoles: ["HOSPITAL_ADMIN", "SUPER_ADMIN"],
    end: true,
    getPath: (w, isSuperAdmin) => (isSuperAdmin ? `/${w}/organizations` : `/${w}/organization`),
  },
  {
    label: "Admin",
    icon: ShieldCheck,
    allowedRoles: ["SUPER_ADMIN"],
    end: true,
    getPath: (w) => `/${w}/admin`,
  },
  {
    label: "Notifications",
    icon: Bell,
    allowedRoles: ["HOSPITAL_ADMIN", "SUPER_ADMIN"],
    end: true,
    getPath: (w) => `/${w}/notifications`,
  },
  {
    label: "Settings",
    icon: Settings,
    allowedRoles: ["HOSPITAL_ADMIN", "SUPER_ADMIN"],
    end: false,
    getPath: (w) => `/${w}/settings`,
  },
];

export default function AppSidebar() {
  const { session, logout, activeWorkspaceId } = useAuthContext();
  const [mobileOpen, setMobileOpen] = useState(false);

  const roles = session?.roles ?? [];
  const isSuperAdmin = roles.includes("SUPER_ADMIN");
  const email = session?.email ?? "";
  const avatarLetter = email.charAt(0).toUpperCase() || "U";
  const displayName = email.split("@")[0] || "User";
  const workspaceId = activeWorkspaceId ?? "";
  const isSystemWorkspace = workspaceId === "system";
  const orgLabel = isSystemWorkspace
    ? "SYSTEM"
    : workspaceId
      ? workspaceId.slice(0, 8).toUpperCase()
      : "ORG";

  const orgQuery = useQuery({
    queryKey: ["org-sidebar", workspaceId, session?.accessToken],
    queryFn: () => getOrganizationById(workspaceId, session?.accessToken),
    enabled: Boolean(workspaceId) && !isSystemWorkspace && Boolean(session?.accessToken),
    staleTime: 5 * 60 * 1000,
  });

  // Treat org as facility when type is "facility" or not explicitly set
  const isFacilityOrg =
    !orgQuery.data ||
    (orgQuery.data as Record<string, unknown>).organization_type !== "service";

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.allowedRoles && !item.allowedRoles.some((r) => roles.includes(r))) return false;
    if (item.showWhen && !item.showWhen({ isFacilityOrg })) return false;
    return true;
  });

  const closeMobile = () => setMobileOpen(false);

  const sidebarContent = (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-dot" />
        <span className="sidebar-brand-copy">
          <strong>RefConnect</strong>
          <small>Kenya</small>
        </span>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const path = workspaceId ? item.getPath(workspaceId, isSuperAdmin) : "/dashboard";
          return (
            <NavLink
              key={item.label}
              to={path}
              end={item.end}
              className={({ isActive }) =>
                `sidebar-nav-item${isActive ? " active" : ""}`
              }
              onClick={closeMobile}
            >
              <Icon size={17} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-org-row">
          <div className="sidebar-org-badge">{orgLabel.slice(0, 2)}</div>
          <span className="sidebar-org-label">{orgLabel}</span>
        </div>
        <div className="sidebar-user">
          <div className="sidebar-avatar">{avatarLetter}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-username">{displayName}</span>
            <span className="sidebar-email">{email}</span>
          </div>
          <button
            className="sidebar-logout-btn"
            onClick={() => logout()}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      <button
        className="sidebar-mobile-toggle"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {mobileOpen && (
        <div className="sidebar-overlay" onClick={closeMobile} />
      )}

      <div className={`sidebar-wrap${mobileOpen ? " sidebar-wrap--open" : ""}`}>
        {sidebarContent}
      </div>
    </>
  );
}
