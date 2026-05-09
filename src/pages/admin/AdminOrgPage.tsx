import { useQueryClient } from "@tanstack/react-query";
import { formatError } from "../../utils/format";
import { Card, CardContent } from "../../components/ui/card";
import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { type ServiceUpsertInput } from "../../api/services";
import { useGetOrganizationById } from "../../api/hooks/organizations/OrganizationById.hook";
import { useGetOrganizationServices } from "../../api/hooks/services/OrganizationServices.hook";
import { usePostOrganizationService } from "../../api/hooks/services/CreateOrganizationService.hook";
import { useDeleteService } from "../../api/hooks/services/DeleteService.hook";
import { useGetPendingInvites } from "../../api/hooks/authentication/PendingInvites.hook";
import { useGetOrganizationMembers } from "../../api/hooks/authentication/OrganizationMembers.hook";
import { usePostInvite } from "../../api/hooks/authentication/CreateInvite.hook";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../../components/ui/breadcrumb";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { useAuthContext } from "../../context/useAuthContext";

type OrgDetailTab = "details" | "services" | "team";

const defaultAddServiceForm: ServiceUpsertInput = {
  service_name: "",
  service_type: "",
  availability: "available",
  notes: "",
};

function OrgTypeBadge({ type }: { type: string }) {
  const label = type === "facility" ? "Facility" : type === "service" ? "Service Provider" : type;
  const cls =
    type === "facility"
      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
      : "bg-sky-50 border-sky-200 text-sky-800";
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

function AdminOrgPage() {
  const { orgId, workspaceId } = useParams<{ orgId: string; workspaceId: string }>();
  const navigate = useNavigate();
  const { session, isAuthenticated } = useAuthContext();
  const queryClient = useQueryClient();

  const roles = session?.roles ?? [];
  const isSuperAdmin = roles.includes("SUPER_ADMIN");

  const [activeTab, setActiveTab] = useState<OrgDetailTab>("details");
  const [showAddService, setShowAddService] = useState(false);
  const [addServiceForm, setAddServiceForm] = useState<ServiceUpsertInput>(defaultAddServiceForm);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("HOSPITAL_ADMIN");
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const orgDetailQuery = useGetOrganizationById(orgId ?? "", session?.accessToken, {
    enabled: isAuthenticated && isSuperAdmin && Boolean(orgId),
    staleTime: 5 * 60 * 1000,
  });

  const orgServicesQuery = useGetOrganizationServices(orgId ?? "", session?.accessToken, {
    enabled: isAuthenticated && isSuperAdmin && Boolean(orgId),
  });

  const pendingInvitesQuery = useGetPendingInvites(orgId ?? "", session?.accessToken, {
    enabled: isAuthenticated && isSuperAdmin && Boolean(orgId) && activeTab === "team",
  });

  const orgMembersQuery = useGetOrganizationMembers(orgId ?? "", session?.accessToken, {
    enabled: isAuthenticated && isSuperAdmin && Boolean(orgId) && activeTab === "team",
  });

  const addServiceMutation = usePostOrganizationService(session?.accessToken, {
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["services", "list", orgId, session?.accessToken] });
      setAddServiceForm(defaultAddServiceForm);
      setShowAddService(false);
    },
  });

  const deleteServiceMutation = useDeleteService(session?.accessToken, {
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["services", "list", orgId, session?.accessToken] }),
  });

  const inviteMutation = usePostInvite(session?.accessToken, {
    onSuccess: async () => {
      const org = orgDetailQuery.data as Record<string, unknown> | undefined;
      setInviteSuccess(`Invite sent to ${inviteEmail.trim()}.`);
      setInviteEmail("");
      setInviteRole("HOSPITAL_ADMIN");
      await queryClient.invalidateQueries({ queryKey: ["invites", "pending", orgId, session?.accessToken] });
      void org;
    },
  });

  if (!isAuthenticated) return <Navigate to="/signin" replace />;
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;
  if (!orgId) return <Navigate to={`/${workspaceId}/admin`} replace />;

  const org = orgDetailQuery.data as Record<string, unknown> | undefined;
  const orgName = org ? String(org.name ?? orgId) : orgId;
  const orgType = org ? String((org as Record<string, unknown>).organization_type ?? "") : "";

  return (
    <section className="org-shell reveal delay-1">
      <Card>
        <CardContent className="flex items-end justify-between gap-3 px-5 py-4">
          <div className="flex flex-col gap-1">
            <p className="eyebrow">System Administration</p>
            <h1 className="font-heading text-2xl font-semibold -tracking-[0.03em] text-slate-900 sm:text-3xl">
              {orgDetailQuery.isLoading ? "Loading…" : orgName}
            </h1>
            {orgType && <OrgTypeBadge type={orgType} />}
          </div>
        </CardContent>
      </Card>

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#" onClick={(e) => { e.preventDefault(); navigate(`/${workspaceId}/admin`); }}>
              Admin
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="#" onClick={(e) => { e.preventDefault(); navigate(`/${workspaceId}/admin`); }}>
              Organizations
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{orgName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <article className="org-table-card">
        {/* Tab bar */}
        <div className="inline-flex gap-1 rounded-xl border border-[rgba(10,45,55,0.13)] bg-[rgba(255,255,255,0.7)] p-1 mb-5">
          {(["details", "services", "team"] as OrgDetailTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition-all ${
                activeTab === tab
                  ? "bg-white shadow-sm text-[#0a5240]"
                  : "text-[#4a6373] hover:text-[#0a5240]"
              }`}
            >
              {tab === "details" ? "Organisation Details" : tab === "services" ? "Services" : "Team"}
            </button>
          ))}
        </div>

        {/* ── DETAILS TAB ── */}
        {activeTab === "details" && (
          <div>
            {orgDetailQuery.isLoading && <p className="org-empty text-sm">Loading details…</p>}
            {orgDetailQuery.isError && <p className="text-sm text-destructive">{formatError(orgDetailQuery.error)}</p>}
            {org && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {[
                  { label: "Name", value: String(org.name ?? "—") },
                  { label: "Facility Code", value: String(org.facility_code ?? "—") || "—", mono: true },
                  { label: "Type", value: String(org.organization_type ?? "—").replace("_", " "), capitalize: true },
                  { label: "Ownership", value: String(org.ownership_type ?? "—").replace("_", " "), capitalize: true },
                  { label: "County", value: String(org.county ?? "—") },
                  { label: "Sub-county", value: String(org.sub_county ?? "—") },
                  { label: "Ward", value: String(org.ward ?? "—") },
                  { label: "Level", value: String(org.level ?? "—") },
                  { label: "Latitude", value: org.lat != null ? String(org.lat) : "—", mono: true },
                  { label: "Longitude", value: org.lng != null ? String(org.lng) : "—", mono: true },
                  { label: "ID", value: orgId ?? "—", mono: true, small: true },
                ].map(({ label, value, mono, capitalize, small }) => (
                  <div key={label} className="field">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
                    <p className={`mt-0.5 ${small ? "text-xs" : "text-sm"} ${mono ? "font-mono" : ""} ${capitalize ? "capitalize" : ""} text-slate-800`}>
                      {value}
                    </p>
                  </div>
                ))}
                <div className="field">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Transport</span>
                  <p className={`text-sm mt-0.5 font-semibold ${org.transport_available ? "text-emerald-700" : "text-slate-400"}`}>
                    {org.transport_available ? "✓ Available" : "—"}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SERVICES TAB ── */}
        {activeTab === "services" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Services</h3>
              {!showAddService && (
                <Button type="button" size="sm" onClick={() => setShowAddService(true)}>
                  + Add Service
                </Button>
              )}
            </div>

            {showAddService && (
              <form
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 grid gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  addServiceMutation.mutate({
                    organizationId: orgId!,
                    payload: {
                      service_name: addServiceForm.service_name?.trim() ?? "",
                      service_type: addServiceForm.service_type?.trim() ?? "",
                      availability: addServiceForm.availability,
                      notes: addServiceForm.notes?.trim() ?? "",
                    },
                  });
                }}
              >
                <div className="grid grid-cols-2 gap-3">
                  <label className="field">
                    <span>Service Name <span className="text-red-500">*</span></span>
                    <input
                      className="field-input"
                      required
                      value={addServiceForm.service_name ?? ""}
                      onChange={(e) => setAddServiceForm((p) => ({ ...p, service_name: e.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Service Type <span className="text-red-500">*</span></span>
                    <input
                      className="field-input"
                      required
                      value={addServiceForm.service_type ?? ""}
                      onChange={(e) => setAddServiceForm((p) => ({ ...p, service_type: e.target.value }))}
                    />
                  </label>
                </div>
                <label className="field">
                  <span>Notes</span>
                  <input
                    className="field-input"
                    value={addServiceForm.notes ?? ""}
                    onChange={(e) => setAddServiceForm((p) => ({ ...p, notes: e.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Availability</span>
                  <Select
                    value={addServiceForm.availability ?? "available"}
                    onValueChange={(v) =>
                      setAddServiceForm((p) => ({ ...p, availability: v as "available" | "limited" | "unavailable" }))
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="limited">Limited</SelectItem>
                      <SelectItem value="unavailable">Unavailable</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                {addServiceMutation.isError && (
                  <p className="text-sm text-destructive">{formatError(addServiceMutation.error)}</p>
                )}
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { setShowAddService(false); addServiceMutation.reset(); }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={addServiceMutation.isPending}>
                    {addServiceMutation.isPending ? "Adding…" : "Add Service"}
                  </Button>
                </div>
              </form>
            )}

            {orgServicesQuery.isLoading && <p className="org-empty text-sm">Loading services…</p>}
            {orgServicesQuery.isError && (
              <p className="text-sm text-destructive">{formatError(orgServicesQuery.error)}</p>
            )}
            {orgServicesQuery.data?.length === 0 && !showAddService && (
              <p className="org-empty text-sm">No services registered yet.</p>
            )}
            {orgServicesQuery.data && orgServicesQuery.data.length > 0 && (
              <div className="org-table-wrap">
                <table className="org-table">
                  <thead>
                    <tr>
                      <th>Name</th><th>Type</th><th>Notes</th><th>Available</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {orgServicesQuery.data.map((svc) => (
                      <tr key={svc.id ?? svc.service_name}>
                        <td className="font-medium">{svc.service_name ?? "—"}</td>
                        <td>{svc.service_type ?? "—"}</td>
                        <td className="text-slate-500">{svc.notes ?? "—"}</td>
                        <td>
                          {svc.availability
                            ? <span className="text-emerald-700 font-semibold">✓ Yes</span>
                            : <span className="text-slate-400">—</span>}
                        </td>
                        <td>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={deleteServiceMutation.isPending}
                            onClick={() => svc.id && deleteServiceMutation.mutate(String(svc.id))}
                            className="text-red-600 hover:text-red-700 hover:border-red-200"
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TEAM TAB ── */}
        {activeTab === "team" && (
          <div className="space-y-8">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-3">Invite User</h3>
              <form
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 grid grid-cols-3 gap-3 w-full"
                onSubmit={(e) => {
                  e.preventDefault();
                  setInviteSuccess(null);
                  inviteMutation.mutate({
                    organizationId: orgId!,
                    organizationName: orgName,
                    roleName: inviteRole,
                    targetEmail: inviteEmail.trim(),
                  });
                }}
              >
                <label className="field">
                  <span>Email address <span className="text-red-500">*</span></span>
                  <input
                    className="field-input"
                    type="email"
                    required
                    placeholder="user@facility.go.ke"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Role</span>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HOSPITAL_ADMIN">Hospital Admin</SelectItem>
                      <SelectItem value="DOCTOR">Doctor</SelectItem>
                      <SelectItem value="NURSE">Nurse</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                <div className="flex items-end">
                  <Button type="submit" size="sm" disabled={inviteMutation.isPending}>
                    {inviteMutation.isPending ? "Sending…" : "Send Invite"}
                  </Button>
                </div>
                {inviteMutation.isError && (
                  <p className="text-sm text-destructive">{formatError(inviteMutation.error)}</p>
                )}
                {inviteSuccess && (
                  <p className="text-sm font-semibold text-emerald-700">{inviteSuccess}</p>
                )}
              </form>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-3">Pending Invites</h3>
              {pendingInvitesQuery.isLoading && <p className="org-empty text-sm">Loading invites…</p>}
              {pendingInvitesQuery.isError && (
                <p className="text-sm text-destructive">{formatError(pendingInvitesQuery.error)}</p>
              )}
              {pendingInvitesQuery.data?.length === 0 && <p className="org-empty text-sm">No pending invites.</p>}
              {pendingInvitesQuery.data && pendingInvitesQuery.data.length > 0 && (
                <div className="org-table-wrap">
                  <table className="org-table">
                    <thead>
                      <tr><th>Email</th><th>Role</th><th>Sent</th><th>Accepted</th><th>Date</th></tr>
                    </thead>
                    <tbody>
                      {pendingInvitesQuery.data.map((invite) => (
                        <tr key={invite.id}>
                          <td>{invite.targetEmail ?? "—"}</td>
                          <td className="capitalize">{invite.roleName ?? "—"}</td>
                          <td>{invite.sent ? <span className="text-emerald-700 font-semibold">✓ Yes</span> : <span className="text-slate-400">—</span>}</td>
                          <td>{invite.accepted ? <span className="text-emerald-700 font-semibold">✓ Yes</span> : <span className="text-slate-400">No</span>}</td>
                          <td className="text-slate-500 text-xs">
                            {invite.createdAt ? new Date(invite.createdAt).toLocaleDateString() : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-3">Members</h3>
              {orgMembersQuery.isLoading && <p className="org-empty text-sm">Loading members…</p>}
              {orgMembersQuery.isError && (
                <p className="text-sm text-destructive">{formatError(orgMembersQuery.error)}</p>
              )}
              {orgMembersQuery.data?.length === 0 && <p className="org-empty text-sm">No members yet.</p>}
              {orgMembersQuery.data && orgMembersQuery.data.length > 0 && (
                <div className="org-table-wrap">
                  <table className="org-table">
                    <thead>
                      <tr><th>Email</th><th>Role</th><th>Status</th><th>Since</th></tr>
                    </thead>
                    <tbody>
                      {orgMembersQuery.data.map((member) => (
                        <tr key={member.id}>
                          <td>{member.userEmail ?? "—"}</td>
                          <td className="capitalize">{member.roleName ?? "—"}</td>
                          <td>
                            {member.active
                              ? <span className="text-emerald-700 font-semibold">✓ Active</span>
                              : <span className="text-slate-400">Inactive</span>}
                          </td>
                          <td className="text-slate-500 text-xs">
                            {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </article>
    </section>
  );
}

export default AdminOrgPage;
