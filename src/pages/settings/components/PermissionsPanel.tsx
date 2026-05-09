import {
  type ColumnDef,
} from "@tanstack/react-table";
import DataTable from "../../../components/DataTable";
import type { AppRole } from "../../../context/authTypes";
import { PERMISSION_ROWS, ROLE_ORDER, type PermissionKey, type SettingsState } from "../types";

type PermissionsPanelProps = {
  settings: SettingsState;
  togglePermission: (permission: PermissionKey, role: AppRole) => void;
};

type PermissionRow = {
  key: PermissionKey;
  label: string;
  description: string;
};

const PermissionsPanel = ({ settings, togglePermission }: PermissionsPanelProps) => {
  const rows: PermissionRow[] = PERMISSION_ROWS.map((row) => ({
    key: row.key,
    label: row.label,
    description: row.description,
  }));

  const columns: ColumnDef<PermissionRow>[] = [
      {
        accessorKey: "label",
        header: "Action",
        cell: ({ row }) => (
          <div>
            <strong className="block text-slate-800">{row.original.label}</strong>
            <small className="text-slate-500">{row.original.description}</small>
          </div>
        ),
      },
      ...ROLE_ORDER.map(
        (roleName): ColumnDef<PermissionRow> => ({
          id: roleName,
          header: roleName,
          cell: ({ row }) => {
            const checked = settings.permissions[row.original.key].includes(roleName);
            return (
              <div className="text-center">
                <label className="inline-flex cursor-pointer flex-col items-center gap-1">
                  <input
                    type="checkbox"
                    className="size-4 accent-emerald-700"
                    checked={checked}
                    onChange={() => togglePermission(row.original.key, roleName)}
                    data-stop-row-click
                  />
                  <span className={checked ? "text-xs text-emerald-700" : "text-xs text-slate-400"}>
                    {checked ? "Allowed" : "Blocked"}
                  </span>
                </label>
              </div>
            );
          },
        }),
      ),
    ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Permissions Matrix</h2>
        <p className="text-sm text-slate-500">Choose which role can perform each system action.</p>
      </div>
      <DataTable
        data={rows}
        columns={columns}
        emptyMessage="No permissions configured."
        resultLabel="permission"
        showPagination={false}
        showSummary={false}
        tableClassName="min-w-[920px]"
        estimatedRowHeight={72}
      />
    </div>
  );
};

export default PermissionsPanel;
