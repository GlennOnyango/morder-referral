import { type ColumnDef } from "@tanstack/react-table";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { AuthGroupName } from "../../api/authAdmin";
import { usePostInvite } from "../../api/hooks/authentication/CreateInvite.hook";
import { useGetOrganizationMembers } from "../../api/hooks/authentication/OrganizationMembers.hook";
import { useGetPendingInvites } from "../../api/hooks/authentication/PendingInvites.hook";
import { useGetOrganizationById } from "../../api/hooks/organizations/OrganizationById.hook";
import { usePostAttachRoleToUser } from "../../api/hooks/users/AttachRoleToUser.hook";
import Breadcrumbs from "../../components/Breadcrumbs";
import DataTable from "../../components/DataTable";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { useAuthContext } from "../../context/useAuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import {
  canManageFacilityCatalog,
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

const FACILITY_ROLE_OPTIONS: { value: AuthGroupName; label: string }[] = [
  { value: "HOSPITAL_ADMIN", label: "Hospital Admin" },
  { value: "HOSPITAL_MEMBER", label: "Hospital Member" },
];

const SERVICE_ROLE_OPTIONS: { value: AuthGroupName; label: string }[] = [
  { value: "SERVICE_ADMIN", label: "Service Admin" },
];

type MemberRow = {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAtLabel: string;
  canAssignRole: boolean;
};

type PendingInviteRow = {
  id: string;
  email: string;
  role: string;
  sent: boolean;
  accepted: boolean;
  createdAtLabel: string;
};

const OrganizationWorkspacePage = () => {
  const { workspaceId: organizationId } = useWorkspace();
  const { session, workspaceRoles, activeWorkspace } = useAuthContext();
  const queryClient = useQueryClient();

  const organizationType = activeWorkspace?.organizationType;
  const roleOptions =
    organizationType === "service-provider"
      ? SERVICE_ROLE_OPTIONS
      : FACILITY_ROLE_OPTIONS;
  const canEditFacility = canManageFacilityCatalog(workspaceRoles);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AuthGroupName>(
    roleOptions[0].value,
  );
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [assignRoleValues, setAssignRoleValues] = useState<
    Record<string, string>
  >({});

  // If the stored role isn't valid for the current org type, fall back to the first option.
  const effectiveInviteRole = roleOptions.some((o) => o.value === inviteRole)
    ? inviteRole
    : roleOptions[0].value;

  const organizationQuery = useGetOrganizationById(
    organizationId,
    session?.accessToken,
    {
      enabled: organizationId.length > 0,
    },
  );

  const membersQuery = useGetOrganizationMembers(
    organizationId,
    session?.accessToken,
    {
      enabled: organizationId.length > 0,
    },
  );

  const pendingInvitesQuery = useGetPendingInvites(
    organizationId,
    session?.accessToken,
    {
      enabled: organizationId.length > 0,
    },
  );

  const inviteMutation = usePostInvite(session?.accessToken, {
    onSuccess: async () => {
      setInviteEmail("");
      setInviteError(null);
      setInviteMessage(`Invitation sent to ${inviteEmail.trim()}.`);
      setTimeout(() => setInviteMessage(null), 3000);
      await queryClient.invalidateQueries({
        queryKey: ["invites", "pending", organizationId, session?.accessToken],
      });
      await queryClient.invalidateQueries({
        queryKey: [
          "members",
          "organization",
          organizationId,
          session?.accessToken,
        ],
      });
    },
    onError: (err) => {
      setInviteMessage(null);
      setInviteError(formatError(err));
    },
  });

  const assignRoleMutation = usePostAttachRoleToUser(session?.accessToken, {
    onSuccess: async (_, { username }) => {
      setAssignRoleValues((prev) => ({ ...prev, [username]: "" }));
      await queryClient.invalidateQueries({
        queryKey: [
          "members",
          "organization",
          organizationId,
          session?.accessToken,
        ],
      });
      setInviteMessage(`Updated role for ${username}.`);
      setTimeout(() => setInviteMessage(null), 3000);
    },
  });

  const facilityName =
    organizationQuery.data?.name ??
    organizationQuery.data?.facility_code ??
    "Facility";

  const members = membersQuery.data ?? [];
  const pendingInvites = pendingInvitesQuery.data ?? [];

  const memberRows: MemberRow[] = members.map((member) => {
    const email = member.userEmail?.trim() || "—";
    return {
      id: String(member.id ?? `${member.organizationId}-${email}`),
      email,
      role: member.roleName?.trim() || "No role",
      isActive: member.active !== false,
      createdAtLabel: member.createdAt
        ? new Date(member.createdAt).toLocaleDateString()
        : "—",
      canAssignRole: email !== "—",
    };
  });

  const pendingInviteRows: PendingInviteRow[] = pendingInvites.map(
    (invite) => ({
      id: String(invite.id ?? `${invite.organizationId}-${invite.targetEmail}`),
      email: invite.targetEmail ?? "—",
      role: invite.roleName ?? "—",
      sent: Boolean(invite.sent),
      accepted: Boolean(invite.accepted),
      createdAtLabel: invite.createdAt
        ? new Date(invite.createdAt).toLocaleDateString()
        : "—",
    }),
  );

  const memberColumns: ColumnDef<MemberRow>[] = [
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <p className="font-medium text-slate-900">{row.original.email}</p>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
          {row.original.role}
        </span>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${
            row.original.isActive
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-slate-100 text-slate-500"
          }`}
        >
          {row.original.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      accessorKey: "createdAtLabel",
      header: "Member Since",
      cell: ({ row }) => (
        <span className="text-slate-600">{row.original.createdAtLabel}</span>
      ),
    },
    {
      id: "assignRole",
      header: "Assign role",
      cell: ({ row }) => (
        <Select
          value={assignRoleValues[row.original.email] ?? ""}
          onValueChange={(val) => {
            if (!row.original.canAssignRole) return;
            setAssignRoleValues((prev) => ({
              ...prev,
              [row.original.email]: val,
            }));
            assignRoleMutation.mutate({
              username: row.original.email,
              groupName: val as AuthGroupName,
            });
          }}
          disabled={assignRoleMutation.isPending || !row.original.canAssignRole}
        >
          <SelectTrigger size="sm" data-stop-row-click className="min-w-36">
            <SelectValue placeholder="Assign role…" />
          </SelectTrigger>
          <SelectContent>
            {roleOptions.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
  ];

  const pendingInviteColumns: ColumnDef<PendingInviteRow>[] = [
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <p className="font-medium text-slate-900">{row.original.email}</p>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
          {row.original.role}
        </span>
      ),
    },
    {
      accessorKey: "sent",
      header: "Sent",
      cell: ({ row }) =>
        row.original.sent ? (
          <span className="font-semibold text-emerald-700">Yes</span>
        ) : (
          <span className="text-slate-500">No</span>
        ),
    },
    {
      accessorKey: "accepted",
      header: "Accepted",
      cell: ({ row }) =>
        row.original.accepted ? (
          <span className="font-semibold text-emerald-700">Yes</span>
        ) : (
          <span className="text-slate-500">No</span>
        ),
    },
    {
      accessorKey: "createdAtLabel",
      header: "Date",
      cell: ({ row }) => (
        <span className="text-slate-600">{row.original.createdAtLabel}</span>
      ),
    },
  ];

  const handleInvite = (e: React.FormEvent<HTMLFormElement>) => {
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
      roleName: effectiveInviteRole,
    });
  };

  return (
    <section className="org-shell reveal delay-1">
      <Card>
        <CardContent className="flex items-start justify-between gap-3 px-5 py-4">
          <div className="flex flex-col gap-1">
            <p className="eyebrow">
              {organizationType === "service-provider"
                ? "Services"
                : "Facilities"}
            </p>
            <h1 className="font-heading text-2xl font-semibold -tracking-[0.03em] text-slate-900 sm:text-3xl">
              {organizationQuery.data?.name ??
                (organizationQuery.isLoading ? "Loading…" : "Organization")}
            </h1>
            <p className="text-sm text-slate-500">
              Organization workspace — manage staff, roles, and invitations.
            </p>
          </div>
          <div className="flex gap-2">
            {canEditFacility && (
              <Button asChild variant="ghost" size="sm">
                <Link to={`/${organizationId}/organization/edit`}>Edit</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Breadcrumbs items={[{ label: facilityName }]} />

      {organizationQuery.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load organization — {formatError(organizationQuery.error)}
        </div>
      )}

      <Card>
        <CardContent className="pt-5">
          <h2 className="mb-1 text-base font-bold text-slate-800">
            Invite a team member
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            Send an invitation to a new user and assign their role.
          </p>
          <form
            onSubmit={handleInvite}
            className="grid gap-3 sm:grid-cols-[1fr_auto_auto]"
          >
            <Input
              type="email"
              placeholder="Email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              disabled={inviteMutation.isPending}
            />
            <Select
              value={effectiveInviteRole}
              onValueChange={(v) => setInviteRole(v as AuthGroupName)}
              disabled={inviteMutation.isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? "Sending…" : "Send Invitation"}
            </Button>
          </form>
          {inviteError && (
            <p className="mt-2 text-sm font-medium text-red-600">
              {inviteError}
            </p>
          )}
          {inviteMessage && (
            <p className="mt-2 text-sm font-medium text-emerald-700">
              {inviteMessage}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <h2 className="mb-1 text-base font-bold text-slate-800">
            Pending invites
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            Invitations that have been created for this organization and are
            still awaiting action.
          </p>

          {pendingInvitesQuery.isLoading && (
            <p className="text-sm text-slate-500">Loading invites…</p>
          )}

          {pendingInvitesQuery.isError && (
            <p className="text-sm text-red-600">
              {formatError(pendingInvitesQuery.error)}
            </p>
          )}

          {!pendingInvitesQuery.isLoading &&
            !pendingInvitesQuery.isError &&
            (pendingInvites.length === 0 ? (
              <p className="text-sm text-slate-500">No pending invites.</p>
            ) : (
              <DataTable
                data={pendingInviteRows}
                columns={pendingInviteColumns}
                emptyMessage="No pending invites."
                resultLabel="invite"
              />
            ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <h2 className="mb-1 text-base font-bold text-slate-800">Members</h2>
          <p className="mb-4 text-sm text-slate-500">
            Members returned by the organization membership service.
          </p>

          {membersQuery.isLoading && (
            <p className="text-sm text-slate-500">Loading members…</p>
          )}

          {membersQuery.isError && (
            <p className="text-sm text-red-600">
              {formatError(membersQuery.error)}
            </p>
          )}

          {!membersQuery.isLoading &&
            !membersQuery.isError &&
            (members.length === 0 ? (
              <p className="text-sm text-slate-500">No members found.</p>
            ) : (
              <DataTable
                data={memberRows}
                columns={memberColumns}
                emptyMessage="No members found."
                resultLabel="member"
              />
            ))}

          {assignRoleMutation.isError && (
            <p className="mt-2 text-sm text-red-600">
              {formatError(assignRoleMutation.error)}
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
};

export default OrganizationWorkspacePage;
