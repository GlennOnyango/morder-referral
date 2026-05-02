import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import type { AuthGroupName } from "../../api/authAdmin";
import { useCreateInvite } from "../../api/hooks/authentication/CreateInvite.hook";
import { useOrganizationMembers } from "../../api/hooks/authentication/OrganizationMembers.hook";
import { usePendingInvites } from "../../api/hooks/authentication/PendingInvites.hook";
import { useOrganizationById } from "../../api/hooks/organizations/OrganizationById.hook";
import { useAttachRoleToUser } from "../../api/hooks/users/AttachRoleToUser.hook";
import Breadcrumbs from "../../components/Breadcrumbs";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useAuthContext } from "../../context/useAuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import {
  canAccessOrganization,
  canManageFacilityCatalog,
  isFacilityManager,
} from "../../utils/facilityAccess";

const formatError = (error: unknown): string => {
  if (isAxiosError(error)) {
    const payload = error.response?.data;
    if (payload && typeof payload === "object" && "message" in payload) {
      const value = (payload as { message?: unknown }).message;
      if (typeof value === "string") return value;
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Request failed. Please try again.";
};

const ROLE_OPTIONS: { value: AuthGroupName; label: string }[] = [
  { value: "HOSPITAL_ADMIN", label: "Hospital Admin" },
  { value: "DOCTOR", label: "Doctor" },
  { value: "NURSE", label: "Nurse" },
];

const OrganizationWorkspacePage = () => {
  const { workspaceId: organizationId } = useWorkspace();
  const { session, isAuthenticated } = useAuthContext();
  const queryClient = useQueryClient();
  const roles = session?.roles ?? [];
  const canManageOrganizations = isFacilityManager(roles);
  const canEditFacility = canManageFacilityCatalog(roles);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AuthGroupName>("DOCTOR");
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [assignRoleValues, setAssignRoleValues] = useState<Record<string, string>>({});

  const organizationQuery = useOrganizationById(organizationId, session?.accessToken, {
    enabled: canManageOrganizations && organizationId.length > 0,
  });

  const facilityCode = organizationQuery.data?.facility_code?.trim() ?? "";

  const membersQuery = useOrganizationMembers(organizationId, session?.accessToken, {
    enabled:
      canManageOrganizations &&
      organizationId.length > 0 &&
      canAccessOrganization(roles, session?.facilityId, organizationQuery.data),
  });

  const pendingInvitesQuery = usePendingInvites(organizationId, session?.accessToken, {
    enabled:
      canManageOrganizations &&
      organizationId.length > 0 &&
      canAccessOrganization(roles, session?.facilityId, organizationQuery.data),
  });

  const inviteMutation = useCreateInvite(session?.accessToken, {
    onSuccess: async () => {
      setInviteEmail("");
      setInviteError(null);
      setInviteMessage(`Invitation sent to ${inviteEmail.trim()}.`);
      setTimeout(() => setInviteMessage(null), 3000);
      await queryClient.invalidateQueries({
        queryKey: ["invites", "pending", organizationId, session?.accessToken],
      });
      await queryClient.invalidateQueries({
        queryKey: ["members", "organization", organizationId, session?.accessToken],
      });
    },
    onError: (err) => {
      setInviteMessage(null);
      setInviteError(formatError(err));
    },
  });

  const assignRoleMutation = useAttachRoleToUser(session?.accessToken, {
    onSuccess: async (_, { username }) => {
      setAssignRoleValues((prev) => ({ ...prev, [username]: "" }));
      await queryClient.invalidateQueries({
        queryKey: ["members", "organization", organizationId, session?.accessToken],
      });
      setInviteMessage(`Updated role for ${username}.`);
      setTimeout(() => setInviteMessage(null), 3000);
    },
  });

  if (!isAuthenticated) return <Navigate to="/signin" replace />;
  if (!canManageOrganizations) return <Navigate to={`/${organizationId}/dashboard`} replace />;
  if (!organizationId) return <Navigate to={`/${organizationId}/dashboard`} replace />;

  if (roles.includes("HOSPITAL_ADMIN") && !session?.facilityId) {
    return <Navigate to={`/${organizationId}/dashboard`} replace />;
  }

  if (
    organizationQuery.data &&
    !canAccessOrganization(roles, session?.facilityId, organizationQuery.data)
  ) {
    return <Navigate to={`/${organizationId}/dashboard`} replace />;
  }

  const facilityName =
    organizationQuery.data?.name ?? organizationQuery.data?.facility_code ?? "Facility";

  const members = membersQuery.data ?? [];
  const pendingInvites = pendingInvitesQuery.data ?? [];

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setInviteError("Email is required.");
      return;
    }
    setInviteError(null);
    setInviteMessage(null);
    inviteMutation.mutate({
      targetEmail: inviteEmail.trim(),
      organizationId,
      organizationName: facilityName,
      roleName: inviteRole,
    });
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Facilities</p>
          <h1 className="text-2xl font-bold text-slate-900">
            {organizationQuery.data?.name ??
              (organizationQuery.isLoading ? "Loading…" : "Facility")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Facility workspace — manage staff and invite new members.
          </p>
        </div>
        <div className="flex gap-2">
          {canEditFacility && (
            <Button asChild variant="ghost" size="sm">
              <Link to={`/${organizationId}/organization/edit`}>Edit Facility</Link>
            </Button>
          )}
        </div>
      </div>

      <Breadcrumbs items={[{ label: facilityName }]} />

      {organizationQuery.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load facility — {formatError(organizationQuery.error)}
        </div>
      )}

      <Card>
        <CardContent className="pt-5">
          <h2 className="mb-1 text-base font-bold text-slate-800">Invite a team member</h2>
          <p className="mb-4 text-sm text-slate-500">
            Send an invitation to a new user and assign their role.
          </p>
          <form onSubmit={handleInvite} className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <Input
              type="email"
              placeholder="Email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              disabled={inviteMutation.isPending || !facilityCode}
            />
            <Select
              value={inviteRole}
              onValueChange={(v) => setInviteRole(v as AuthGroupName)}
              disabled={inviteMutation.isPending || !facilityCode}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" disabled={inviteMutation.isPending || !facilityCode}>
              {inviteMutation.isPending ? "Sending…" : "Send Invitation"}
            </Button>
          </form>
          {!facilityCode && !organizationQuery.isLoading && (
            <p className="mt-2 text-sm text-amber-700">
              Facility code not available — invitations cannot be sent.
            </p>
          )}
          {inviteError && <p className="mt-2 text-sm font-medium text-red-600">{inviteError}</p>}
          {inviteMessage && (
            <p className="mt-2 text-sm font-medium text-emerald-700">{inviteMessage}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <h2 className="mb-1 text-base font-bold text-slate-800">Organisation members</h2>
          <p className="mb-4 text-sm text-slate-500">
            Members returned by the organization membership service.
          </p>

          {membersQuery.isLoading && (
            <p className="text-sm text-slate-500">Loading members…</p>
          )}

          {membersQuery.isError && (
            <p className="text-sm text-red-600">{formatError(membersQuery.error)}</p>
          )}

          {!membersQuery.isLoading && !membersQuery.isError && (
            members.length === 0 ? (
              <p className="text-sm text-slate-500">No members found for this organization.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Member Since</TableHead>
                    <TableHead className="w-32">Assign role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => {
                    const memberEmail = member.userEmail?.trim() || "—";
                    const memberRole = member.roleName?.trim() || "No role";
                    const isActive = member.active !== false;

                    return (
                      <TableRow key={member.id ?? `${member.organizationId}-${member.userEmail}`}>
                        <TableCell>
                          <p className="font-medium text-slate-900">{memberEmail}</p>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                            {memberRole}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${
                              isActive
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-slate-100 text-slate-500"
                            }`}
                          >
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {member.createdAt
                            ? new Date(member.createdAt).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={assignRoleValues[memberEmail] ?? ""}
                            onValueChange={(val) => {
                              if (memberEmail === "—") return;
                              setAssignRoleValues((prev) => ({ ...prev, [memberEmail]: val }));
                              assignRoleMutation.mutate({
                                username: memberEmail,
                                groupName: val as AuthGroupName,
                              });
                            }}
                            disabled={assignRoleMutation.isPending || memberEmail === "—"}
                          >
                            <SelectTrigger size="sm">
                              <SelectValue placeholder="Assign role…" />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLE_OPTIONS.map(({ value, label }) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )
          )}

          {assignRoleMutation.isError && (
            <p className="mt-2 text-sm text-red-600">{formatError(assignRoleMutation.error)}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <h2 className="mb-1 text-base font-bold text-slate-800">Pending invites</h2>
          <p className="mb-4 text-sm text-slate-500">
            Invitations that have been created for this organization and are still awaiting action.
          </p>

          {pendingInvitesQuery.isLoading && (
            <p className="text-sm text-slate-500">Loading invites…</p>
          )}

          {pendingInvitesQuery.isError && (
            <p className="text-sm text-red-600">{formatError(pendingInvitesQuery.error)}</p>
          )}

          {!pendingInvitesQuery.isLoading && !pendingInvitesQuery.isError && (
            pendingInvites.length === 0 ? (
              <p className="text-sm text-slate-500">No pending invites.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Accepted</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvites.map((invite) => (
                    <TableRow key={invite.id ?? `${invite.organizationId}-${invite.targetEmail}`}>
                      <TableCell>
                        <p className="font-medium text-slate-900">{invite.targetEmail ?? "—"}</p>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                          {invite.roleName ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {invite.sent ? (
                          <span className="text-emerald-700 font-semibold">Yes</span>
                        ) : (
                          <span className="text-slate-500">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {invite.accepted ? (
                          <span className="text-emerald-700 font-semibold">Yes</span>
                        ) : (
                          <span className="text-slate-500">No</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {invite.createdAt ? new Date(invite.createdAt).toLocaleDateString() : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          )}
        </CardContent>
      </Card>
    </section>
  );
};

export default OrganizationWorkspacePage;
