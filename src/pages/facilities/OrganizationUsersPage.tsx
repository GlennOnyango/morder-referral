import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useWorkspace } from "../../context/WorkspaceContext";
import {
  attachRoleToUser,
  FACILITY_USER_GROUP_FILTERS,
  listFacilityUsers,
  type AuthGroupName,
  type AuthUser,
  type FacilityUserGroupFilter,
} from "../../api/authAdmin";
import { getOrganizationById } from "../../api/organizations";
import Breadcrumbs from "../../components/Breadcrumbs";
import { useAuthContext } from "../../context/useAuthContext";
import { canAccessOrganization, isFacilityManager } from "../../utils/facilityAccess";

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

function getDisplayGroups(user: AuthUser, sessionEmail?: string, sessionRoles?: string[] | null): string[] {
  const groups = new Set(
    user.groups
      .map((group) => group.trim())
      .filter((group) => group.length > 0),
  );

  const normalizedSessionEmail = sessionEmail?.trim().toLowerCase();
  const normalizedUsername = user.username.trim().toLowerCase();
  const normalizedUserEmail = user.email?.trim().toLowerCase();
  const isSignedInUser =
    normalizedSessionEmail !== undefined &&
    (normalizedSessionEmail === normalizedUsername || normalizedSessionEmail === normalizedUserEmail);

  if (isSignedInUser && sessionRoles?.includes("SUPER_ADMIN")) {
    groups.add("SUPER_ADMIN");
  }

  return Array.from(groups);
}

const FACILITY_USER_GROUP_FILTER_LABELS: Record<FacilityUserGroupFilter, string> = {
  none: "none",
  all: "all",
  hospital_admin: "hospital_admin",
  doctor: "doctor",
  nurse: "nurse",
};

function OrganizationUsersPage() {
  const { workspaceId: organizationId } = useWorkspace();
  const { session, isAuthenticated } = useAuthContext();
  const roles = session?.roles ?? [];
  const canManageOrganizations = isFacilityManager(roles);
  const canAttachRoles = roles.includes("HOSPITAL_ADMIN") || roles.includes("SUPER_ADMIN");
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
  const facilityName =
    organizationQuery.data?.name ?? organizationQuery.data?.facility_code ?? "Facility";

  const usersQuery = useQuery({
    queryKey: [
      "organization-users",
      organizationId,
      facilityCode,
      selectedUserGroupFilter,
      session?.accessToken,
    ],
    queryFn: () => listFacilityUsers(facilityCode, selectedUserGroupFilter, session?.accessToken),
    enabled:
      canManageOrganizations &&
      facilityCode.length > 0 &&
      canAccessOrganization(roles, session?.facilityId, organizationQuery.data),
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

  if (roles.includes("HOSPITAL_ADMIN") && !session?.facilityId) {
    return <Navigate to={`/${organizationId}/dashboard`} replace />;
  }

  if (organizationQuery.data && !canAccessOrganization(roles, session?.facilityId, organizationQuery.data)) {
    return <Navigate to={`/${organizationId}/dashboard`} replace />;
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
      </div>

      <Breadcrumbs
        items={[
          { label: facilityName, to: `/${organizationId}/organization` },
          { label: "Users" },
        ]}
      />

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
            <label className="org-filter-control">
              Group filter
              <Select
                value={selectedUserGroupFilter}
                onValueChange={(v) => setSelectedUserGroupFilter(v as FacilityUserGroupFilter)}
              >
                <SelectTrigger className="org-filter-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FACILITY_USER_GROUP_FILTERS.map((group) => (
                    <SelectItem key={group} value={group}>
                      {FACILITY_USER_GROUP_FILTER_LABELS[group]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  {users.map((user) => {
                    const displayGroups = getDisplayGroups(user, session?.email, session?.roles);

                    return (
                    <tr key={user.username}>
                      <td>{user.username}</td>
                      <td>{user.email ?? "-"}</td>
                      <td>{user.status ?? (user.enabled === true ? "ENABLED" : "-")}</td>
                      <td>{displayGroups.length > 0 ? displayGroups.join(", ") : "-"}</td>
                      {canAttachRoles ? (
                        <td>
                          <Select
                            value={resolveSelectedRole(user)}
                            onValueChange={(v) =>
                              setSelectedGroupByUsername((previous) => ({
                                ...previous,
                                [user.username]: v as AuthGroupName,
                              }))
                            }
                          >
                            <SelectTrigger className="user-role-select"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="HOSPITAL_ADMIN">hospital_admin</SelectItem>
                              <SelectItem value="DOCTOR">doctor</SelectItem>
                              <SelectItem value="NURSE">nurse</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      ) : null}
                      {canAttachRoles ? (
                        <td>
                          <Button
                            type="button"
                            className="btn btn-primary org-btn"
                            disabled={attachRoleMutation.isPending}
                            onClick={() => handleAttachRole(user)}
                          >
                            Attach
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                    );
                  })}
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

