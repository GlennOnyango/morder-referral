import type { AppRole } from "../../../context/authTypes";
import { ROLE_ORDER, type PermissionKey, type SettingsState } from "../types";

type WorkflowPanelProps = {
  settings: SettingsState;
  togglePermission: (permission: PermissionKey, role: AppRole) => void;
  updateBooleanSetting: (key: keyof Omit<SettingsState, "permissions">, value: boolean) => void;
};

type SwitchRowProps = {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
};

const SwitchRow = ({ label, description, checked, disabled, onChange }: SwitchRowProps) => (
  <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-3">
    <span>
      <strong className="block text-sm text-slate-800">{label}</strong>
      <small className="text-xs text-slate-500">{description}</small>
    </span>
    <input
      type="checkbox"
      className="size-4 accent-emerald-700"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
    />
  </label>
);

const WorkflowPanel = ({ settings, togglePermission, updateBooleanSetting }: WorkflowPanelProps) => (
  <div className="grid gap-4 md:grid-cols-2">
    <article className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Referral Workflow</h2>
        <p className="text-sm text-slate-500">
          Control referral creation privileges and post-creation routing behavior.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Who can create referrals</p>
        <div className="flex flex-wrap gap-3">
          {ROLE_ORDER.map((roleName) => {
            const checked = settings.permissions.createReferrals.includes(roleName);
            return (
              <label
                key={`create-${roleName}`}
                className="inline-flex cursor-pointer items-center gap-1.5 text-sm"
              >
                <input
                  type="checkbox"
                  className="size-4 accent-emerald-700"
                  checked={checked}
                  onChange={() => togglePermission("createReferrals", roleName)}
                />
                <span>{roleName}</span>
              </label>
            );
          })}
        </div>
      </div>

      <SwitchRow
        label="Do referrals need approval after creation?"
        description="When enabled, only roles with referral approval permission can finalize referrals."
        checked={settings.requireApprovalAfterCreation}
        onChange={(value) => updateBooleanSetting("requireApprovalAfterCreation", value)}
      />
      <SwitchRow
        label="Allow direct referrals"
        description="Enable immediate direct referral routing when the sender has permission."
        checked={settings.allowDirectReferrals}
        onChange={(value) => updateBooleanSetting("allowDirectReferrals", value)}
      />
    </article>

    <article className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">AI Settings</h2>
        <p className="text-sm text-slate-500">
          Enable or disable AI capabilities used in referral workflows.
        </p>
      </div>
      <SwitchRow
        label="Enable AI settings"
        description="Master switch for AI features in this application."
        checked={settings.aiEnabled}
        onChange={(value) => updateBooleanSetting("aiEnabled", value)}
      />
      <SwitchRow
        label="Enable AI search"
        description="Allow AI-assisted search and retrieval across referral data."
        checked={settings.aiSearchEnabled}
        disabled={!settings.aiEnabled}
        onChange={(value) => updateBooleanSetting("aiSearchEnabled", value)}
      />
      <SwitchRow
        label="Enable AI review"
        description="Allow AI-generated referral review and summarization."
        checked={settings.aiReviewEnabled}
        disabled={!settings.aiEnabled}
        onChange={(value) => updateBooleanSetting("aiReviewEnabled", value)}
      />
    </article>
  </div>
);

export default WorkflowPanel;
