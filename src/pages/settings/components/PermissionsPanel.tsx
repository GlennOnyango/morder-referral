import type { AppRole } from "../../../context/authTypes";
import { PERMISSION_ROWS, ROLE_ORDER, type PermissionKey, type SettingsState } from "../types";

type PermissionsPanelProps = {
  settings: SettingsState;
  togglePermission: (permission: PermissionKey, role: AppRole) => void;
};

const PermissionsPanel = ({ settings, togglePermission }: PermissionsPanelProps) => (
  <div className="space-y-4">
    <div>
      <h2 className="text-lg font-bold text-slate-900">Permissions Matrix</h2>
      <p className="text-sm text-slate-500">Choose which role can perform each system action.</p>
    </div>
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-2.5 text-left font-semibold text-slate-700">Action</th>
            {ROLE_ORDER.map((roleName) => (
              <th key={roleName} className="px-4 py-2.5 text-center font-semibold text-slate-700">
                {roleName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {PERMISSION_ROWS.map((row) => (
            <tr key={row.key} className="bg-white hover:bg-slate-50/60">
              <td className="px-4 py-3">
                <strong className="block text-slate-800">{row.label}</strong>
                <small className="text-slate-500">{row.description}</small>
              </td>
              {ROLE_ORDER.map((roleName) => {
                const checked = settings.permissions[row.key].includes(roleName);
                return (
                  <td key={`${row.key}-${roleName}`} className="px-4 py-3 text-center">
                    <label className="inline-flex cursor-pointer flex-col items-center gap-1">
                      <input
                        type="checkbox"
                        className="size-4 accent-emerald-700"
                        checked={checked}
                        onChange={() => togglePermission(row.key, roleName)}
                      />
                      <span className={checked ? "text-xs text-emerald-700" : "text-xs text-slate-400"}>
                        {checked ? "Allowed" : "Blocked"}
                      </span>
                    </label>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default PermissionsPanel;
