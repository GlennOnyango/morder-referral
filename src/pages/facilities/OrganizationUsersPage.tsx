import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { formatError } from "../../utils/format";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useWorkspace } from "../../context/WorkspaceContext";
import type { AuthGroupName } from "../../api/authAdmin";
import { usePostAttachRoleToUser } from "../../api/hooks/users/AttachRoleToUser.hook";
import { useGetOrganizationMembers } from "../../api/hooks/authentication/OrganizationMembers.hook";
import { useGetOrganizationById } from "../../api/hooks/organizations/OrganizationById.hook";
import Breadcrumbs from "../../components/Breadcrumbs";
import { useAuthContext } from "../../context/useAuthContext";
import { canAccessOrganization, isFacilityManager } from "../../utils/facilityAccess";
import type { DtoUserOrganizationMappingResponse } from "../../types/auth.generated";

const ROLE_OPTIONS: { value: AuthGroupName; label: string }[] = [
  { value: "HOSPITAL_ADMIN", label: "Hospital Admin" },
  { value: "DOCTOR", label: "Doctor" },
  { value: "NURSE", label: "Nurse" },
];

function inferDefaultRole(member: DtoUserOrganizationMappingResponse): AuthGroupName {
  const role = member.roleName?.trim().toUpperCase() ?? "";
  if (role === "HOSPITAL_ADMIN") return "HOSPITAL_ADMIN";
  if (role === "DOCTOR") return "DOCTOR";
  return "NURSE";
}

function OrganizationUsersPage() {
  const { workspaceId: organizationId } = useWorkspace();
  const { session, isAuthenticated } = useAuthContext();
  const roles = session?.roles ?? [];
  const canManageOrganizations = isFacilityManager(roles);
  const canAttachRoles = roles.includes("HOSPITAL_ADMIN") || roles.includes("SUPER_ADMIN");
  const queryClient = useQueryClient();

  const [selectedRoleByEmail, setSelectedRoleByEmail] = useState<Record<string, AuthGroupName>>({});
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);

  const organizationQuery = useGetOrganizationById(organizationId, session?.accessToken, {
    enabled: canManageOrganizations && organizationId.length > 0,
  });

  const facilityName =
    organizationQuery.data?.name ?? organizationQuery.data?.facility_code ?? "Facility";

  const membersQuery = useGetOrganizationMembers(organizationId, session?.accessToken, {
    enabled:
      canManageOrganizations &&
      organizationId.length > 0 &&
      canAccessOrganization(roles, session?.facilityId, organizationQuery.data),
  });

  const attachRoleMutation = usePostAttachRoleToUser(session?.accessToken, {
    onSuccess: async (_data, variables) => {
      setLastActionMessage(`Updated ${variables.username} to ${variables.groupName}.`);
      await queryClient.invalidateQueries({
        queryKey: ["members", "organization", organizationId, session?.accessToken],
      });
    },
  });

  const members = membersQuery.data ?? [];

  const resolveRole = (member: DtoUserOrganizationMappingResponse): AuthGroupName =>
    selectedRoleByEmail[member.userEmail ?? ""] ?? inferDefaultRole(member);

  const handleAttachRole = (member: DtoUserOrganizationMappingResponse) => {
    if (!canAttachRoles || !member.userEmail) return;
    setLastActionMessage(null);
    attachRoleMutation.mutate({ username: member.userEmail, groupName: resolveRole(member) });
  };

  if (!isAuthenticated) return <Navigate to="/signin" replace />;
  if (!canManageOrganizations) return <Navigate to="/dashboard" replace />;
  if (!organizationId) return <Navigate to="/facilities" replace />;

  if (roles.includes("HOSPITAL_ADMIN") && !session?.facilityId) {
    return <Navigate to={`/${organizationId}/dashboard`} replace />;
  }

  if (organizationQuery.data && !canAccessOrganization(roles, session?.facilityId, organizationQuery.data)) {
    return <Navigate to={`/${organizationId}/dashboard`} replace />;
  }

  return (
    <section className="org-shell reveal delay-1">
      <Card>
        <CardContent className="px-5 py-4">
          <div className="flex flex-col gap-1">
            <p className="eyebrow">Facilities</p>
            <h1 className="font-heading text-2xl font-semibold -tracking-[0.03em] text-slate-900 sm:text-3xl">
              Facility users:{" "}
              {organizationQuery.data?.name ?? (organizationQuery.isLoading ? "Loading..." : "Facility")}
            </h1>
            <p className="text-sm text-slate-500">View members registered under this organisation.</p>
          </div>
        </CardContent>
      </Card>

      <Breadcrumbs
        items={[
          { label: facilityName, to: `/${organizationId}/organization` },
          { label: "Users" },
        ]}
      />

      {organizationQuery.isError && (
        <article className="access-note error-block">
          <h2>Could not load facility</h2>
          <p>{formatError(organizationQuery.error)}</p>
        </article>
      )}

      {membersQuery.isLoading && (
        <article className="access-note">
          <h2>Loading members</h2>
          <p>Fetching organisation members…</p>
        </article>
      )}

      {membersQuery.isError && (
        <article className="access-note error-block">
          <h2>Could not load members</h2>
          <p>{formatError(membersQuery.error)}</p>
        </article>
      )}

      {membersQuery.data && (
        <article className="org-table-card">
          {members.length === 0 ? (
            <p className="org-empty">No members found for this organisation.</p>
          ) : (
            <div className="org-table-wrap">
              <table className="org-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    {canAttachRoles && <th>Assign Role</th>}
                    {canAttachRoles && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => {
                    const email = member.userEmail ?? "—";
                    const isActive = member.active !== false;

                    return (
                      <tr key={member.id ?? email}>
                        <td>{email}</td>
                        <td>{member.roleName ?? "—"}</td>
                        <td>{isActive ? "Active" : "Inactive"}</td>
                        {canAttachRoles && (
                          <td>
                            <Select
                              value={resolveRole(member)}
                              onValueChange={(v) =>
                                setSelectedRoleByEmail((prev) => ({
                                  ...prev,
                                  [email]: v as AuthGroupName,
                                }))
                              }
                            >
                              <SelectTrigger className="user-role-select"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {ROLE_OPTIONS.map(({ value, label }) => (
                                  <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        )}
                        {canAttachRoles && (
                          <td>
                            <Button
                              type="button"
                              className="btn btn-primary org-btn"
                              disabled={attachRoleMutation.isPending || email === "—"}
                              onClick={() => handleAttachRole(member)}
                            >
                              Attach
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </article>
      )}

      {attachRoleMutation.isError && (
        <p className="result-note error-note">{formatError(attachRoleMutation.error)}</p>
      )}
      {lastActionMessage && <p className="result-note success-note">{lastActionMessage}</p>}
    </section>
  );
}

export default OrganizationUsersPage;
