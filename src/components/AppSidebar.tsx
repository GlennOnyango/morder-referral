import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Inbox,
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
import { useAuthContext } from "../context/useAuthContext";
import type { AppRole, OrgType } from "../context/authTypes";

type OrgTypeKey = OrgType | "admin";

type NavItem = {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  end?: boolean;
  showFor: OrgTypeKey[];
  requiredRoles?: AppRole[];
  getPath: (workspaceId: string, isSuperAdmin: boolean) => string;
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    end: true,
    showFor: ["facility", "service-provider"],
    getPath: (w) => `/${w}/dashboard`,
  },
  {
    label: "Referral Pool",
    icon: Inbox,
    end: false,
    showFor: ["facility", "service-provider", "admin"],
    getPath: (w) => `/${w}/referral-pool`,
  },
  {
    label: "Facility Referrals",
    icon: ArrowLeftRight,
    end: false,
    showFor: ["facility"],
    getPath: (w) => `/${w}/referrals-facility`,
  },
  {
    label: "Services",
    icon: Activity,
    end: false,
    showFor: ["service-provider"],
    getPath: (w) => `/${w}/services`,
  },
  {
    label: "Facility Service",
    icon: Stethoscope,
    end: false,
    showFor: ["facility"],
    getPath: (w) => `/${w}/facility-services`,
  },
  {
    label: "Organization",
    icon: Building2,
    end: true,
    showFor: ["facility", "service-provider"],
    requiredRoles: ["HOSPITAL_ADMIN", "SERVICE_ADMIN", "SUPER_ADMIN"],
    getPath: (w, isSuperAdmin) =>
      isSuperAdmin ? `/${w}/organizations` : `/${w}/organization`,
  },
  {
    label: "Admin",
    icon: ShieldCheck,
    end: true,
    showFor: ["admin"],
    getPath: (w) => `/${w}/admin`,
  },
  {
    label: "Notifications",
    icon: Bell,
    end: true,
    showFor: ["facility", "service-provider", "admin"],
    getPath: (w) => `/${w}/notifications`,
  },
  {
    label: "Settings",
    icon: Settings,
    end: false,
    showFor: ["facility", "service-provider"],
    getPath: (w) => `/${w}/settings`,
  },
];

export default function AppSidebar() {
  const { session, logout, activeWorkspaceId, activeWorkspace, workspaceRoles } =
    useAuthContext();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isSuperAdmin = workspaceRoles.includes("SUPER_ADMIN");
  const workspaceId = activeWorkspaceId ?? "";
  const isSystemWorkspace = workspaceId === "system";

  const currentOrgType: OrgTypeKey = isSystemWorkspace || !activeWorkspace
    ? "admin"
    : activeWorkspace.organizationType;

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.showFor.includes(currentOrgType)) return false;
    if (item.requiredRoles && !item.requiredRoles.some((r) => workspaceRoles.includes(r))) return false;
    return true;
  });

  const email = session?.email ?? "";
  const avatarLetter = email.charAt(0).toUpperCase() || "U";
  const displayName = email.split("@")[0] || "User";
  const orgLabel =
    activeWorkspace?.name ?? (workspaceId.slice(0, 8).toUpperCase() || "ORG");

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
          const path = workspaceId
            ? item.getPath(workspaceId, isSuperAdmin)
            : "/dashboard";
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

      {mobileOpen && <div className="sidebar-overlay" onClick={closeMobile} />}

      <div className={`sidebar-wrap${mobileOpen ? " sidebar-wrap--open" : ""}`}>
        {sidebarContent}
      </div>
    </>
  );
}
