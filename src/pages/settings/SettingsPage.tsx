import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  attachRoleToUser,
  deleteUser,
  listFacilityUsers,
  setUserEnabledStatus,
  type AuthGroupName,
  type AuthUser,
} from "../../api/authAdmin";
import { listOrganizations } from "../../api/organizations";
import Breadcrumbs from "../../components/Breadcrumbs";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import type { AppRole } from "../../context/authTypes";
import { useAuthContext } from "../../context/useAuthContext";
import { cn } from "../../lib/utils";
import { isOrganizationOwnedBySessionFacility } from "../../utils/facilityAccess";
import PermissionsPanel from "./components/PermissionsPanel";
import ProfilePanel from "./components/ProfilePanel";
import StaffPanel from "./components/StaffPanel";
import WorkflowPanel from "./components/WorkflowPanel";
import {
  NAV_ITEMS,
  SETTINGS_STORAGE_KEY,
  type ActivePanel,
  type PermissionKey,
  type SettingsState,
} from "./types";
import { inferDefaultGroup, isUserEnabled, readStoredSettings } from "./utils";

const SettingsPage = () => {
  const { session, isAuthenticated } = useAuthContext();
  const roles = session?.roles ?? [];
  const canAccessSettings = roles.includes("SUPER_ADMIN") || roles.includes("HOSPITAL_ADMIN");
  const isSuperAdmin = roles.includes("SUPER_ADMIN");
  const isHospitalAdmin = roles.includes("HOSPITAL_ADMIN");
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState<SettingsState>(() => readStoredSettings());
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [activePanel, setActivePanel] = useState<ActivePanel>("profile");
  const [selectedGroupByUsername, setSelectedGroupByUsername] = useState<
    Record<string, AuthGroupName>
  >({});
  const [lastStaffActionMessage, setLastStaffActionMessage] = useState<string | null>(null);
  const [superAdminFacilityCode, setSuperAdminFacilityCode] = useState(
    session?.facilityId?.trim() ?? "",
  );

  const assignedFacilityQuery = useQuery({
    queryKey: ["settings-hospital-admin-facility", session?.accessToken, session?.facilityId],
    queryFn: async () => {
      const organizations = await listOrganizations(session?.accessToken);
      return (
        organizations.find((org) =>
          isOrganizationOwnedBySessionFacility(org, session?.facilityId),
        ) ?? null
      );
    },
    enabled: isAuthenticated && isHospitalAdmin && Boolean(session?.facilityId),
  });

  const hospitalFacilityCode = assignedFacilityQuery.data?.facility_code?.trim() ?? "";
  const staffFacilityCode = isHospitalAdmin
    ? hospitalFacilityCode
    : superAdminFacilityCode.trim();
  const canLoadStaff = canAccessSettings && staffFacilityCode.length > 0;

  const staffQuery = useQuery({
    queryKey: ["settings-staff", staffFacilityCode, session?.accessToken],
    queryFn: () => listFacilityUsers(staffFacilityCode, "all", session?.accessToken),
    enabled: canLoadStaff,
  });

  const attachRoleMutation = useMutation({
    mutationFn: ({ username, groupName }: { username: string; groupName: AuthGroupName }) =>
      attachRoleToUser({ username, groupName }, session?.accessToken),
    onSuccess: async (_res, variables) => {
      setLastStaffActionMessage(`Updated ${variables.username} to ${variables.groupName}.`);
      await queryClient.invalidateQueries({
        queryKey: ["settings-staff", staffFacilityCode, session?.accessToken],
      });
    },
  });

  const updateEnabledMutation = useMutation({
    mutationFn: ({ username, enabled }: { username: string; enabled: boolean }) =>
      setUserEnabledStatus(
        { username, enabled, facility_code: staffFacilityCode },
        session?.accessToken,
      ),
    onSuccess: async (_res, variables) => {
      setLastStaffActionMessage(
        `${variables.username} has been ${variables.enabled ? "enabled" : "disabled"}.`,
      );
      await queryClient.invalidateQueries({
        queryKey: ["settings-staff", staffFacilityCode, session?.accessToken],
      });
    },
  });

  const deleteStaffMutation = useMutation({
    mutationFn: ({ username }: { username: string }) =>
      deleteUser({ username, facility_code: staffFacilityCode }, session?.accessToken),
    onSuccess: async (_res, variables) => {
      setLastStaffActionMessage(`${variables.username} has been removed.`);
      await queryClient.invalidateQueries({
        queryKey: ["settings-staff", staffFacilityCode, session?.accessToken],
      });
    },
  });

  const users = useMemo(() => staffQuery.data ?? [], [staffQuery.data]);

  const persistSettings = (next: SettingsState) => {
    setSettings(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    }
    setSettingsSaved(true);
    window.setTimeout(() => setSettingsSaved(false), 1400);
  };

  const togglePermission = (permission: PermissionKey, targetRole: AppRole) => {
    const current = settings.permissions[permission];
    const nextRoles = current.includes(targetRole)
      ? current.filter((r) => r !== targetRole)
      : [...current, targetRole];
    persistSettings({
      ...settings,
      permissions: { ...settings.permissions, [permission]: nextRoles },
    });
  };

  const updateBooleanSetting = (
    key: keyof Omit<SettingsState, "permissions">,
    value: boolean,
  ) => {
    const next = { ...settings, [key]: value };
    if (key === "aiEnabled" && !value) {
      next.aiSearchEnabled = false;
      next.aiReviewEnabled = false;
    }
    persistSettings(next);
  };

  const resolveSelectedRole = (user: AuthUser): AuthGroupName =>
    selectedGroupByUsername[user.username] ?? inferDefaultGroup(user);

  const onGroupChange = (username: string, group: AuthGroupName) =>
    setSelectedGroupByUsername((prev) => ({ ...prev, [username]: group }));

  const onAssignRole = (user: AuthUser) => {
    setLastStaffActionMessage(null);
    attachRoleMutation.mutate({
      username: user.username,
      groupName: resolveSelectedRole(user),
    });
  };

  const onToggleEnabled = (user: AuthUser) => {
    setLastStaffActionMessage(null);
    updateEnabledMutation.mutate({
      username: user.username,
      enabled: !isUserEnabled(user),
    });
  };

  const onDeleteUser = (user: AuthUser) => {
    if (!window.confirm(`Delete user ${user.username}? This action cannot be undone.`)) return;
    setLastStaffActionMessage(null);
    deleteStaffMutation.mutate({ username: user.username });
  };

  if (!isAuthenticated) return <Navigate to="/signin" replace />;
  if (!canAccessSettings) return <Navigate to="/dashboard" replace />;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Settings</p>
          <h1 className="text-2xl font-bold text-slate-900">System permissions and controls</h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure referral permissions, approval behavior, AI controls, and staff management
            rules.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <Card className="h-fit p-3">
          <p className="px-2 py-1 text-xs font-bold uppercase tracking-widest text-slate-400">
            Navigate
          </p>
          <nav className="mt-1 flex flex-col gap-0.5" aria-label="Settings sections">
            {NAV_ITEMS.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                className={cn(
                  "w-full justify-start rounded-lg px-3 py-2 text-sm font-semibold",
                  activePanel === item.id
                    ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-50"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
                )}
                onClick={() => setActivePanel(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </nav>
        </Card>

        <Card className="space-y-4 p-5">
          <Breadcrumbs
            items={[
              { label: "Home", to: "/" },
              { label: "Dashboard", to: "/dashboard" },
              { label: "Settings" },
            ]}
          />

          {settingsSaved && (
            <p className="text-sm font-medium text-emerald-700">Settings saved.</p>
          )}

          {activePanel === "profile" && (
            <ProfilePanel
              email={session?.email}
              roles={roles}
              facilityId={session?.facilityId}
              staffFacilityCode={staffFacilityCode}
            />
          )}

          {activePanel === "permissions" && (
            <PermissionsPanel settings={settings} togglePermission={togglePermission} />
          )}

          {activePanel === "workflow" && (
            <WorkflowPanel
              settings={settings}
              togglePermission={togglePermission}
              updateBooleanSetting={updateBooleanSetting}
            />
          )}

          {activePanel === "staff" && (
            <StaffPanel
              isSuperAdmin={isSuperAdmin}
              isHospitalAdmin={isHospitalAdmin}
              superAdminFacilityCode={superAdminFacilityCode}
              onSuperAdminFacilityCodeChange={setSuperAdminFacilityCode}
              facilityQuery={{
                isLoading: assignedFacilityQuery.isLoading,
                isError: assignedFacilityQuery.isError,
                error: assignedFacilityQuery.error,
              }}
              canLoadStaff={canLoadStaff}
              staffQuery={{
                isLoading: staffQuery.isLoading,
                isError: staffQuery.isError,
                error: staffQuery.error,
                hasData: Boolean(staffQuery.data),
              }}
              users={users}
              resolveSelectedRole={resolveSelectedRole}
              onGroupChange={onGroupChange}
              onAssignRole={onAssignRole}
              onToggleEnabled={onToggleEnabled}
              onDeleteUser={onDeleteUser}
              assignRoleMutation={{
                isPending: attachRoleMutation.isPending,
                isError: attachRoleMutation.isError,
                error: attachRoleMutation.error,
              }}
              updateEnabledMutation={{
                isPending: updateEnabledMutation.isPending,
                isError: updateEnabledMutation.isError,
                error: updateEnabledMutation.error,
              }}
              deleteStaffMutation={{
                isPending: deleteStaffMutation.isPending,
                isError: deleteStaffMutation.isError,
                error: deleteStaffMutation.error,
              }}
              lastStaffActionMessage={lastStaffActionMessage}
            />
          )}
        </Card>
      </div>
    </section>
  );
};

export default SettingsPage;
