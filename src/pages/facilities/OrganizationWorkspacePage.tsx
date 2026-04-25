import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  attachRoleToUser,
  inviteUser,
  listFacilityUsers,
  type AuthGroupName,
} from "../../api/authAdmin";
import { getOrganizationById } from "../../api/organizations";
import Breadcrumbs from "../../components/Breadcrumbs";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
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

function formatError(error: unknown): string {
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
}

const ROLE_OPTIONS: { value: AuthGroupName; label: string }[] = [
  { value: "HOSPITAL_ADMIN", label: "Hospital Admin" },
  { value: "DOCTOR", label: "Doctor" },
  { value: "NURSE", label: "Nurse" },
];

function OrganizationWorkspacePage() {
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

  const organizationQuery = useQuery({
    queryKey: ["organizations", "detail", organizationId, session?.accessToken],
    queryFn: () => getOrganizationById(organizationId, session?.accessToken),
    enabled: canManageOrganizations && organizationId.length > 0,
  });

  const facilityCode = organizationQuery.data?.facility_code?.trim() ?? "";

  const usersQuery = useQuery({
    queryKey: ["organization-users", organizationId, facilityCode, "all", session?.accessToken],
    queryFn: () => listFacilityUsers(facilityCode, "all", session?.accessToken),
    enabled:
      canManageOrganizations &&
      facilityCode.length > 0 &&
      canAccessOrganization(roles, session?.facilityId, organizationQuery.data),
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      inviteUser(
        { email: inviteEmail.trim(), facility_code: facilityCode, groupName: inviteRole },
        session?.accessToken,
      ),
    onSuccess: async () => {
      setInviteEmail("");
      setInviteError(null);
      setInviteMessage(`Invitation sent to ${inviteEmail.trim()}.`);
      setTimeout(() => setInviteMessage(null), 3000);
      await queryClient.invalidateQueries({
        queryKey: ["organization-users", organizationId, facilityCode],
      });
    },
    onError: (err) => {
      setInviteMessage(null);
      setInviteError(formatError(err));
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: ({ username, groupName }: { username: string; groupName: AuthGroupName }) =>
      attachRoleToUser({ username, groupName }, session?.accessToken),
    onSuccess: async (_, { username }) => {
      setAssignRoleValues((prev) => ({ ...prev, [username]: "" }));
      await queryClient.invalidateQueries({
        queryKey: ["organization-users", organizationId, facilityCode],
      });
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

  const users = usersQuery.data ?? [];

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setInviteError("Email is required.");
      return;
    }
    setInviteError(null);
    setInviteMessage(null);
    inviteMutation.mutate();
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

      {/* ── Invite ── */}
      <Card>
        <CardContent className="pt-5">
          <h2 className="text-base font-bold text-slate-800 mb-1">Invite a team member</h2>
          <p className="text-sm text-slate-500 mb-4">
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
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="submit"
              disabled={inviteMutation.isPending || !facilityCode}
            >
              {inviteMutation.isPending ? "Sending…" : "Send Invitation"}
            </Button>
          </form>
          {!facilityCode && !organizationQuery.isLoading && (
            <p className="mt-2 text-sm text-amber-700">
              Facility code not available — invitations cannot be sent.
            </p>
          )}
          {inviteError && (
            <p className="mt-2 text-sm font-medium text-red-600">{inviteError}</p>
          )}
          {inviteMessage && (
            <p className="mt-2 text-sm font-medium text-emerald-700">{inviteMessage}</p>
          )}
        </CardContent>
      </Card>

      {/* ── Users table ── */}
      <Card>
        <CardContent className="pt-5">
          <h2 className="text-base font-bold text-slate-800 mb-1">Organisation members</h2>
          <p className="text-sm text-slate-500 mb-4">
            All users associated with this facility.
          </p>

          {!facilityCode && !organizationQuery.isLoading && (
            <p className="text-sm text-slate-500">
              No facility code — cannot load users.
            </p>
          )}

          {usersQuery.isLoading && facilityCode && (
            <p className="text-sm text-slate-500">Loading members…</p>
          )}

          {usersQuery.isError && (
            <p className="text-sm text-red-600">{formatError(usersQuery.error)}</p>
          )}

          {!usersQuery.isLoading && !usersQuery.isError && facilityCode && (
            users.length === 0 ? (
              <p className="text-sm text-slate-500">No members found for this facility.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username / Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role(s)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-32" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const displayGroups = user.groups.filter(Boolean);
                    const isEnabled = user.enabled !== false;

                    return (
                      <TableRow key={user.username}>
                        <TableCell>
                          <p className="font-medium text-slate-900">{user.username}</p>
                          {user.email && user.email !== user.username && (
                            <p className="text-xs text-slate-500">{user.email}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-600">{user.name ?? "—"}</TableCell>
                        <TableCell>
                          {displayGroups.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {displayGroups.map((g) => (
                                <span
                                  key={g}
                                  className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700"
                                >
                                  {g}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">No role</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                              isEnabled
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-500 border border-slate-200"
                            }`}
                          >
                            {isEnabled ? "Active" : "Disabled"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={assignRoleValues[user.username] ?? ""}
                            onValueChange={(val) => {
                              setAssignRoleValues((prev) => ({ ...prev, [user.username]: val }));
                              assignRoleMutation.mutate({ username: user.username, groupName: val as AuthGroupName });
                            }}
                            disabled={assignRoleMutation.isPending}
                          >
                            <SelectTrigger size="sm"><SelectValue placeholder="Assign role…" /></SelectTrigger>
                            <SelectContent>
                              {ROLE_OPTIONS.map(({ value, label }) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
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
    </section>
  );
}

export default OrganizationWorkspacePage;
