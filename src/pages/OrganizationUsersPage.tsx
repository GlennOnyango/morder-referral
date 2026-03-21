import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  attachRoleToUser,
  FACILITY_USER_GROUP_FILTERS,
  listFacilityUsers,
  type AuthGroupName,
  type AuthUser,
  type FacilityUserGroupFilter,
} from "../api/authAdmin";
import { getOrganizationById } from "../api/organizations";
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

function OrganizationUsersPage() {
  const { id } = useParams<{ id: string }>();
  const organizationId = id ?? "";
  const { session, isAuthenticated } = useAuthContext();
  const role = session?.role ?? "unknown";
  const canManageOrganizations = role === "admin" || role === "super_admin";
  const canAttachRoles = role === "super_admin";
  const queryClient = useQueryClient();

  const [selectedGroupByUsername, setSelectedGroupByUsername] = useState<
    Record<string, AuthGroupName>
  >({});
  const [selectedUserGroupFilter, setSelectedUserGroupFilter] =
    useState<FacilityUserGroupFilter>("none");
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);

  const organizationQuery = useQuery({
    queryKey: ["organizations", "detail", organizationId, session?.accessToken],
    queryFn: () => getOrganizationById(organizationId, session?.accessToken),
    enabled: canManageOrganizations && organizationId.length > 0,
  });

  const facilityCode = organizationQuery.data?.facility_code?.trim() ?? "";

  const usersQuery = useQuery({
    queryKey: [
      "organization-users",
      organizationId,
      facilityCode,
      selectedUserGroupFilter,
      session?.accessToken,
    ],
    queryFn: () => listFacilityUsers(facilityCode, selectedUserGroupFilter, session?.accessToken),
    enabled: canManageOrganizations && facilityCode.length > 0,
  });

  const attachRoleMutation = useMutation({
    mutationFn: ({ username, groupName }: { username: string; groupName: AuthGroupName }) =>
      attachRoleToUser({ username, groupName }, session?.accessToken),
    onSuccess: async (_data, variables) => {
      setLastActionMessage(`Updated ${variables.username} to ${variables.groupName}.`);
      await queryClient.invalidateQueries({
        queryKey: ["organization-users", organizationId],
      });
    },
  });

  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);

  const resolveSelectedRole = (user: AuthUser): AuthGroupName => {
    return selectedGroupByUsername[user.username] ?? inferDefaultGroup(user);
  };

  const handleAttachRole = (user: AuthUser) => {
    if (!canAttachRoles) {
      return;
    }

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

  if (!canManageOrganizations) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!organizationId) {
    return <Navigate to="/facilities" replace />;
  }

  return (
    <section className="org-shell reveal delay-1">
      <div className="org-header">
        <div>
          <p className="eyebrow">Facilities</p>
          <h1>
            Facility users:{" "}
            {organizationQuery.data?.name ?? (organizationQuery.isLoading ? "Loading..." : "Facility")}
          </h1>
          <p>View users registered under this facility.</p>
        </div>
        <div className="org-actions">
          <Link className="btn btn-ghost org-btn" to={`/facilities/${organizationId}`}>
            Workspace
          </Link>
          <Link className="btn btn-ghost org-btn" to={`/facilities/${organizationId}/patients`}>
            Patients
          </Link>
          <Link className="btn btn-ghost org-btn" to={`/facilities/${organizationId}/services`}>
            Services
          </Link>
          <Link className="btn btn-ghost org-btn" to="/facilities">
            Back to Facilities
          </Link>
        </div>
      </div>

      {organizationQuery.isError ? (
        <article className="access-note error-block">
          <h2>Could not load facility</h2>
          <p>{formatError(organizationQuery.error)}</p>
        </article>
      ) : null}

      {organizationQuery.data && !facilityCode ? (
        <article className="access-note error-block">
          <h2>Missing facility code</h2>
          <p>This facility has no facility code, so users cannot be loaded.</p>
        </article>
      ) : null}

      {usersQuery.isLoading ? (
        <article className="access-note">
          <h2>Loading users</h2>
          <p>Fetching facility users from the authentication service...</p>
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
          <div className="org-table-tools">
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
          {users.length === 0 ? (
            <p className="org-empty">No users found for this facility.</p>
          ) : (
            <div className="org-table-wrap">
              <table className="org-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Current Groups</th>
                    {canAttachRoles ? <th>Attach Role</th> : null}
                    {canAttachRoles ? <th>Action</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.username}>
                      <td>{user.username}</td>
                      <td>{user.email ?? "-"}</td>
                      <td>{user.status ?? (user.enabled === true ? "ENABLED" : "-")}</td>
                      <td>{user.groups.length > 0 ? user.groups.join(", ") : "-"}</td>
                      {canAttachRoles ? (
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
                      ) : null}
                      {canAttachRoles ? (
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
                      ) : null}
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

export default OrganizationUsersPage;


