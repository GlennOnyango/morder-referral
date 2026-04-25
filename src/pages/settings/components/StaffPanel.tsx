import type { AuthGroupName, AuthUser } from "../../../api/authAdmin";
import { Button } from "../../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Input } from "../../../components/ui/input";
import type { MutationInfo, QueryInfo } from "../types";
import { formatError, isUserEnabled } from "../utils";

type StaffPanelProps = {
  isSuperAdmin: boolean;
  isHospitalAdmin: boolean;
  superAdminFacilityCode: string;
  onSuperAdminFacilityCodeChange: (value: string) => void;
  facilityQuery: QueryInfo;
  canLoadStaff: boolean;
  staffQuery: QueryInfo & { hasData: boolean };
  users: AuthUser[];
  resolveSelectedRole: (user: AuthUser) => AuthGroupName;
  onGroupChange: (username: string, group: AuthGroupName) => void;
  onAssignRole: (user: AuthUser) => void;
  onToggleEnabled: (user: AuthUser) => void;
  onDeleteUser: (user: AuthUser) => void;
  assignRoleMutation: MutationInfo;
  updateEnabledMutation: MutationInfo;
  deleteStaffMutation: MutationInfo;
  lastStaffActionMessage: string | null;
};

const StaffPanel = ({
  isSuperAdmin,
  isHospitalAdmin,
  superAdminFacilityCode,
  onSuperAdminFacilityCodeChange,
  facilityQuery,
  canLoadStaff,
  staffQuery,
  users,
  resolveSelectedRole,
  onGroupChange,
  onAssignRole,
  onToggleEnabled,
  onDeleteUser,
  assignRoleMutation,
  updateEnabledMutation,
  deleteStaffMutation,
  lastStaffActionMessage,
}: StaffPanelProps) => (
  <div className="space-y-4">
    <div>
      <h2 className="text-lg font-bold text-slate-900">Manage Staff</h2>
      <p className="text-sm text-slate-500">
        Enable or disable users, change user roles, and remove users from the selected facility.
      </p>
    </div>

    {isSuperAdmin && (
      <div className="max-w-xs space-y-1">
        <label className="text-sm font-semibold text-slate-700" htmlFor="settings-facility-code">
          Facility code
        </label>
        <Input
          id="settings-facility-code"
          value={superAdminFacilityCode}
          onChange={(e) => onSuperAdminFacilityCodeChange(e.target.value)}
          placeholder="Enter facility code"
        />
      </div>
    )}

    {isHospitalAdmin && facilityQuery.isLoading && (
      <p className="text-sm text-slate-500">Resolving your assigned facility...</p>
    )}
    {isHospitalAdmin && facilityQuery.isError && (
      <p className="text-sm font-semibold text-rose-700">{formatError(facilityQuery.error)}</p>
    )}

    {!canLoadStaff && (
      <p className="text-sm text-slate-500">Provide a facility code to view and manage staff.</p>
    )}
    {canLoadStaff && staffQuery.isLoading && (
      <p className="text-sm text-slate-500">Loading facility users...</p>
    )}
    {canLoadStaff && staffQuery.isError && (
      <p className="text-sm font-semibold text-rose-700">{formatError(staffQuery.error)}</p>
    )}

    {canLoadStaff && staffQuery.hasData && (
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Username", "Email", "Status", "Current Groups", "Change Role", "Enable/Disable", "Delete"].map(
                (heading) => (
                  <th
                    key={heading}
                    className="px-3 py-2.5 text-left font-semibold text-slate-700"
                  >
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-slate-500">
                  No users found for this facility.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const enabled = isUserEnabled(user);
                return (
                  <tr key={user.username} className="bg-white hover:bg-slate-50/60">
                    <td className="px-3 py-2.5 font-medium text-slate-800">{user.username}</td>
                    <td className="px-3 py-2.5 text-slate-600">{user.email ?? "-"}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          enabled
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {enabled ? "ENABLED" : "DISABLED"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {user.groups.length > 0 ? user.groups.join(", ") : "-"}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Select value={resolveSelectedRole(user)} onValueChange={(v) => onGroupChange(user.username, v as AuthGroupName)}>
                          <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="HOSPITAL_ADMIN">HOSPITAL_ADMIN</SelectItem>
                            <SelectItem value="DOCTOR">DOCTOR</SelectItem>
                            <SelectItem value="NURSE">NURSE</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          disabled={assignRoleMutation.isPending}
                          onClick={() => onAssignRole(user)}
                        >
                          Save
                        </Button>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={updateEnabledMutation.isPending}
                        onClick={() => onToggleEnabled(user)}
                      >
                        {enabled ? "Disable" : "Enable"}
                      </Button>
                    </td>
                    <td className="px-3 py-2.5">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={deleteStaffMutation.isPending}
                        onClick={() => onDeleteUser(user)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    )}

    {assignRoleMutation.isError && (
      <p className="text-sm font-semibold text-rose-700">{formatError(assignRoleMutation.error)}</p>
    )}
    {updateEnabledMutation.isError && (
      <p className="text-sm font-semibold text-rose-700">
        {formatError(updateEnabledMutation.error)}
      </p>
    )}
    {deleteStaffMutation.isError && (
      <p className="text-sm font-semibold text-rose-700">
        {formatError(deleteStaffMutation.error)}
      </p>
    )}
    {lastStaffActionMessage && (
      <p className="text-sm font-medium text-emerald-700">{lastStaffActionMessage}</p>
    )}
  </div>
);

export default StaffPanel;
