import { useState } from "react";
import { Navigate } from "react-router-dom";
import Breadcrumbs from "../../components/Breadcrumbs";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import type { AppRole } from "../../context/authTypes";
import { useAuthContext } from "../../context/useAuthContext";
import { cn } from "../../lib/utils";
import PermissionsPanel from "./components/PermissionsPanel";
import ProfilePanel from "./components/ProfilePanel";
import WorkflowPanel from "./components/WorkflowPanel";
import WorkspacePanel from "./components/WorkspacePanel";
import {
  NAV_ITEMS,
  SETTINGS_STORAGE_KEY,
  type ActivePanel,
  type PermissionKey,
  type SettingsState,
} from "./types";
import { readStoredSettings } from "./utils";

const SettingsPage = () => {
  const { session, isAuthenticated } = useAuthContext();
  const roles = session?.roles ?? [];
  const canAccessSettings = roles.includes("SUPER_ADMIN") || roles.includes("HOSPITAL_ADMIN");

  const [settings, setSettings] = useState<SettingsState>(() => readStoredSettings());
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [activePanel, setActivePanel] = useState<ActivePanel>("profile");

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

  if (!isAuthenticated) return <Navigate to="/signin" replace />;
  if (!canAccessSettings) return <Navigate to="/dashboard" replace />;

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Settings</p>
        <h1 className="text-2xl font-bold text-slate-900">System permissions and controls</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure referral permissions, approval behaviour, and AI controls.
        </p>
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
          <Breadcrumbs items={[{ label: "Settings" }]} />

          {settingsSaved && (
            <p className="text-sm font-medium text-emerald-700">Settings saved.</p>
          )}

          {activePanel === "profile" && (
            <ProfilePanel
              email={session?.email}
              roles={roles}
              facilityId={session?.facilityId}
            />
          )}

          {activePanel === "workspace" && <WorkspacePanel />}

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
        </Card>
      </div>
    </section>
  );
};

export default SettingsPage;
