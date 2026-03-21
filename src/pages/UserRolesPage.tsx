import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  attachRoleToUser,
  FACILITY_USER_GROUP_FILTERS,
  listFacilityUsers,
  type AuthGroupName,
  type AuthUser,
  type FacilityUserGroupFilter,
} from "../api/authAdmin";
import { useAuthContext } from "../context/AuthContext";

function formatError(error: unknown): string {
  if (isAxiosError(error)) {
    const payload = error.response?.data;
    if (payload && typeof payload === "object" && "message" in payload) {
      const value = (payload as { message?: unknown }).message;
      if (typeof value === "string") {
        return value;
      }
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Request failed. Please try again.";
}

function inferDefaultGroup(user: AuthUser): AuthGroupName {
  const normalizedGroups = user.groups.map((group) => group.trim().toUpperCase());

  if (normalizedGroups.includes("HOSPITAL_ADMIN")) {
    return "HOSPITAL_ADMIN";
  }

  if (normalizedGroups.includes("DOCTOR")) {
    return "DOCTOR";
  }

  return "NURSE";
}

const FACILITY_USER_GROUP_FILTER_LABELS: Record<FacilityUserGroupFilter, string> = {
  none: "none",
  all: "all",
  hospital_admin: "hospital_admin",
  doctor: "doctor",
  nurse: "nurse",
};

function UserRolesPage() {
  const { session, isAuthenticated } = useAuthContext();
  const role = session?.role ?? "unknown";
  const isSuperAdmin = role === "super_admin";
  const queryClient = useQueryClient();

  const [selectedGroupByUsername, setSelectedGroupByUsername] = useState<
    Record<string, AuthGroupName>
  >({});
  const [selectedUserGroupFilter, setSelectedUserGroupFilter] =
    useState<FacilityUserGroupFilter>("none");
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: [
      "auth-users",
      session?.accessToken,
      session?.facilityId,
      selectedUserGroupFilter,
    ],
    queryFn: () =>
      listFacilityUsers(session?.facilityId ?? "", selectedUserGroupFilter, session?.accessToken),
    enabled: isAuthenticated && isSuperAdmin && Boolean(session?.facilityId),
  });

  const attachRoleMutation = useMutation({
    mutationFn: ({ username, groupName }: { username: string; groupName: AuthGroupName }) =>
      attachRoleToUser({ username, groupName }, session?.accessToken),
    onSuccess: async (_data, variables) => {
      setLastActionMessage(`Updated ${variables.username} to ${variables.groupName}.`);
      await queryClient.invalidateQueries({ queryKey: ["auth-users"] });
    },
  });

  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);

  const resolveSelectedRole = (user: AuthUser): AuthGroupName => {
    return selectedGroupByUsername[user.username] ?? inferDefaultGroup(user);
  };

  const handleAttachRole = (user: AuthUser) => {
    const selectedRole = resolveSelectedRole(user);
    setLastActionMessage(null);
    attachRoleMutation.mutate({
      username: user.username,
      groupName: selectedRole,
    });
  };

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <section className="org-shell reveal delay-1">
      <div className="org-header">
        <div>
          <p className="eyebrow">Access Control</p>
          <h1>Manage user roles</h1>
          <p>View facility users and attach a role group (`HOSPITAL_ADMIN`, `DOCTOR`, `NURSE`).</p>
        </div>
        <div className="org-actions">
          <label className="org-filter-control" htmlFor="facility-group-filter">
            Group filter
            <select
              id="facility-group-filter"
              className="field-input org-filter-select"
              value={selectedUserGroupFilter}
              onChange={(event) =>
                setSelectedUserGroupFilter(event.target.value as FacilityUserGroupFilter)
              }
            >
              {FACILITY_USER_GROUP_FILTERS.map((group) => (
                <option key={group} value={group}>
                  {FACILITY_USER_GROUP_FILTER_LABELS[group]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {!session?.facilityId ? (
        <article className="access-note error-block">
          <h2>Missing facility ID</h2>
          <p>Could not resolve `facility_id` from your session token.</p>
        </article>
      ) : null}

      {usersQuery.isLoading ? (
        <article className="access-note">
          <h2>Loading users</h2>
          <p>Fetching users from the authentication service...</p>
        </article>
      ) : null}

      {usersQuery.isError ? (
        <article className="access-note error-block">
          <h2>Could not load users</h2>
          <p>{formatError(usersQuery.error)}</p>
        </article>
      ) : null}

      {usersQuery.data ? (
        <article className="org-table-card">
          {users.length === 0 ? (
            <p className="org-empty">No users found.</p>
          ) : (
            <div className="org-table-wrap">
              <table className="org-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Current Groups</th>
                    <th>Attach Role</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.username}>
                      <td>{user.username}</td>
                      <td>{user.email ?? "-"}</td>
                      <td>{user.status ?? (user.enabled === true ? "ENABLED" : "-")}</td>
                      <td>{user.groups.length > 0 ? user.groups.join(", ") : "-"}</td>
                      <td>
                        <select
                          className="field-input user-role-select"
                          value={resolveSelectedRole(user)}
                          onChange={(event) =>
                            setSelectedGroupByUsername((previous) => ({
                              ...previous,
                              [user.username]: event.target.value as AuthGroupName,
                            }))
                          }
                        >
                          <option value="HOSPITAL_ADMIN">HOSPITAL_ADMIN</option>
                          <option value="DOCTOR">DOCTOR</option>
                          <option value="NURSE">NURSE</option>
                        </select>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-primary org-btn"
                          disabled={attachRoleMutation.isPending}
                          onClick={() => handleAttachRole(user)}
                        >
                          Attach
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      ) : null}

      {attachRoleMutation.isError ? (
        <p className="result-note error-note">{formatError(attachRoleMutation.error)}</p>
      ) : null}

      {lastActionMessage ? <p className="result-note success-note">{lastActionMessage}</p> : null}
    </section>
  );
}

export default UserRolesPage;
