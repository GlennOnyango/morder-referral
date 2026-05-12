import {
  type ColumnDef,
} from "@tanstack/react-table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatError } from "../../utils/format";
import { Card, CardContent } from "../../components/ui/card";
import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { type ServiceUpsertInput } from "../../api/services";
import { type OrganizationUpdateInput } from "../../api/organizations";
import { useGetOrganizationById } from "../../api/hooks/organizations/OrganizationById.hook";
import { usePutOrganization } from "../../api/hooks/organizations/UpdateOrganization.hook";
import { usePutService } from "../../api/hooks/services/UpdateService.hook";
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
import DataTable from "../../components/DataTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { useAuthContext } from "../../context/useAuthContext";

type OrgDetailTab = "details" | "services" | "team";

type OrgEditFormState = {
  name: string;
  facility_code: string;
  county: string;
  subcounty: string;
  ward: string;
  transport_available: boolean;
  level: string;
  lat: string;
  lng: string;
  ownership_type: "public" | "private" | "faith_based";
  organization_type: "facility" | "service";
};

type CountyOption = { name: string; code: string; subcounties: { name: string; wards: { name: string }[] }[] };

const defaultEditForm: OrgEditFormState = {
  name: "", facility_code: "", county: "", subcounty: "", ward: "",
  transport_available: false, level: "", lat: "", lng: "",
  ownership_type: "public", organization_type: "facility",
};

function mapOrgToEditForm(org: Record<string, unknown>): OrgEditFormState {
  return {
    name: typeof org.name === "string" ? org.name : "",
    facility_code: typeof org.facility_code === "string" ? org.facility_code : "",
    county: typeof org.county === "number" ? org.county.toString().padStart(3, "0") : "",
    subcounty: typeof org.sub_county === "string" ? org.sub_county : "",
    ward: typeof org.ward === "string" ? org.ward : "",
    transport_available: typeof org.transport_available === "boolean" ? org.transport_available : false,
    level: typeof org.level === "number" ? org.level.toString() : "",
    lat: typeof org.lat === "number" ? org.lat.toString() : "",
    lng: typeof org.lng === "number" ? org.lng.toString() : "",
    ownership_type:
      org.ownership_type === "private" || org.ownership_type === "faith_based"
        ? org.ownership_type
        : "public",
    organization_type: org.organization_type === "service" ? "service" : "facility",
  };
}

function mapEditFormToPayload(form: OrgEditFormState): OrganizationUpdateInput | null {
  const county = Number(form.county);
  const level = Number(form.level);
  const lat = Number(form.lat);
  const lng = Number(form.lng);
  if ([county, level, lat, lng].some(Number.isNaN) || !form.subcounty.trim() || !form.ward.trim()) {
    return null;
  }
  return {
    name: form.name.trim(),
    facility_code: form.facility_code.trim(),
    county,
    sub_county: form.subcounty.trim(),
    ward: form.ward.trim(),
    transport_available: form.transport_available,
    level,
    lat,
    lng,
    ownership_type: form.ownership_type,
    organization_type: form.organization_type,
  };
}

type ServiceOrgEditFormState = {
  service_name: string;
  service_type: string;
  availability: "available" | "limited" | "unavailable";
  notes: string;
};

const defaultServiceOrgEditForm: ServiceOrgEditFormState = {
  service_name: "",
  service_type: "",
  availability: "available",
  notes: "",
};

function mapOrgToServiceEditForm(org: Record<string, unknown>): ServiceOrgEditFormState {
  return {
    service_name: typeof org.name === "string" ? org.name : "",
    service_type: typeof org.service_type === "string" ? org.service_type : "",
    availability:
      org.availability === "limited" || org.availability === "unavailable"
        ? org.availability
        : "available",
    notes: typeof org.notes === "string" ? org.notes : "",
  };
}

const defaultAddServiceForm: ServiceUpsertInput = {
  service_name: "",
  service_type: "",
  availability: "available",
  notes: "",
};

type AdminOrgServiceRow = {
  id: string;
  name: string;
  type: string;
  notes: string;
  availability: string;
};

type AdminPendingInviteRow = {
  id: string;
  email: string;
  role: string;
  sent: boolean;
  accepted: boolean;
  date: string;
};

type AdminMemberRow = {
  id: string;
  email: string;
  role: string;
  active: boolean;
  since: string;
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
  const { session } = useAuthContext();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<OrgDetailTab>("details");
  const [showAddService, setShowAddService] = useState(false);
  const [addServiceForm, setAddServiceForm] = useState<ServiceUpsertInput>(defaultAddServiceForm);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("HOSPITAL_ADMIN");
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormOverrides, setEditFormOverrides] = useState<OrgEditFormState | null>(null);
  const [serviceOrgEditFormOverrides, setServiceOrgEditFormOverrides] = useState<ServiceOrgEditFormState | null>(null);
  const [editValidationError, setEditValidationError] = useState<string | null>(null);

  const orgDetailQuery = useGetOrganizationById(orgId ?? "", session?.accessToken, {
    enabled: Boolean(orgId),
    staleTime: 5 * 60 * 1000,
  });

  const orgServicesQuery = useGetOrganizationServices(orgId ?? "", session?.accessToken, {
    enabled: Boolean(orgId),
  });

  const pendingInvitesQuery = useGetPendingInvites(orgId ?? "", session?.accessToken, {
    enabled: Boolean(orgId) && activeTab === "team",
  });

  const orgMembersQuery = useGetOrganizationMembers(orgId ?? "", session?.accessToken, {
    enabled: Boolean(orgId) && activeTab === "team",
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

  const countyOptionsQuery = useQuery<CountyOption[]>({
    queryKey: ["kenya-administrative-units"],
    queryFn: async () => {
      const res = await fetch("/kenya-administrative-units.json", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load county data.");
      return res.json() as Promise<CountyOption[]>;
    },
    staleTime: Infinity,
    enabled: isEditing,
  });

  const updateOrgMutation = usePutOrganization(session?.accessToken, {
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organization", orgId] });
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      setIsEditing(false);
      setEditFormOverrides(null);
      setEditValidationError(null);
    },
  });

  const updateServiceOrgMutation = usePutService(session?.accessToken, {
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organization", orgId] });
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      setIsEditing(false);
      setServiceOrgEditFormOverrides(null);
      setEditValidationError(null);
    },
  });

  if (!orgId) return <Navigate to={`/${workspaceId}/admin`} replace />;

  const org = orgDetailQuery.data as Record<string, unknown> | undefined;
  const orgName = org ? String(org.name ?? orgId) : orgId;
  const orgType = org ? String((org as Record<string, unknown>).organization_type ?? "") : "";
  const isServiceOrg = orgType === "service";
  const roleOptions = isServiceOrg
    ? [{ value: "SERVICE_ADMIN", label: "Service Admin" }]
    : [
        { value: "HOSPITAL_ADMIN", label: "Hospital Admin" },
        { value: "HOSPITAL_MEMBER", label: "Hospital Member" },
      ];
  const effectiveInviteRole = roleOptions.some((r) => r.value === inviteRole)
    ? inviteRole
    : roleOptions[0]?.value ?? "HOSPITAL_ADMIN";
  const services = Array.isArray(orgServicesQuery.data) ? orgServicesQuery.data : [];

  const serviceRows: AdminOrgServiceRow[] = services.map((svc) => ({
    id: String(svc.id ?? svc.service_name ?? ""),
    name: svc.service_name ?? "—",
    type: svc.service_type ?? "—",
    notes: svc.notes ?? "—",
    availability: svc.availability ?? "—",
  }));

  const pendingInviteRows: AdminPendingInviteRow[] = (pendingInvitesQuery.data ?? []).map((invite) => ({
    id: String(invite.id ?? `${invite.organizationId}-${invite.targetEmail}`),
    email: invite.targetEmail ?? "—",
    role: invite.roleName ?? "—",
    sent: Boolean(invite.sent),
    accepted: Boolean(invite.accepted),
    date: invite.createdAt ? new Date(invite.createdAt).toLocaleDateString() : "—",
  }));

  const memberRows: AdminMemberRow[] = (orgMembersQuery.data ?? []).map((member) => ({
    id: String(member.id ?? `${member.organizationId}-${member.userEmail}`),
    email: member.userEmail ?? "—",
    role: member.roleName ?? "—",
    active: Boolean(member.active),
    since: member.createdAt ? new Date(member.createdAt).toLocaleDateString() : "—",
  }));

  const serviceColumns: ColumnDef<AdminOrgServiceRow>[] = [
      { accessorKey: "name", header: "Name", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
      { accessorKey: "type", header: "Type" },
      { accessorKey: "notes", header: "Notes", cell: ({ row }) => <span className="text-slate-500">{row.original.notes}</span> },
      {
        accessorKey: "availability",
        header: "Available",
        cell: ({ row }) =>
          row.original.availability && row.original.availability !== "unavailable" ? (
            <span className="font-semibold text-emerald-700">Yes</span>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={deleteServiceMutation.isPending || !row.original.id}
            onClick={() => row.original.id && deleteServiceMutation.mutate(row.original.id)}
            className="text-red-600 hover:text-red-700 hover:border-red-200"
          >
            Remove
          </Button>
        ),
      },
    ];

  const pendingInviteColumns: ColumnDef<AdminPendingInviteRow>[] = [
      { accessorKey: "email", header: "Email" },
      { accessorKey: "role", header: "Role", cell: ({ row }) => <span className="capitalize">{row.original.role}</span> },
      {
        accessorKey: "sent",
        header: "Sent",
        cell: ({ row }) =>
          row.original.sent ? <span className="font-semibold text-emerald-700">Yes</span> : <span className="text-slate-400">—</span>,
      },
      {
        accessorKey: "accepted",
        header: "Accepted",
        cell: ({ row }) =>
          row.original.accepted ? <span className="font-semibold text-emerald-700">Yes</span> : <span className="text-slate-400">No</span>,
      },
      { accessorKey: "date", header: "Date", cell: ({ row }) => <span className="text-xs text-slate-500">{row.original.date}</span> },
    ];

  const memberColumns: ColumnDef<AdminMemberRow>[] = [
      { accessorKey: "email", header: "Email" },
      { accessorKey: "role", header: "Role", cell: ({ row }) => <span className="capitalize">{row.original.role}</span> },
      {
        accessorKey: "active",
        header: "Status",
        cell: ({ row }) =>
          row.original.active ? (
            <span className="font-semibold text-emerald-700">Active</span>
          ) : (
            <span className="text-slate-400">Inactive</span>
          ),
      },
      { accessorKey: "since", header: "Since", cell: ({ row }) => <span className="text-xs text-slate-500">{row.original.since}</span> },
    ];

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
        {activeTab === "details" && (() => {
          // ── shared read view ──────────────────────────────────────────────
          const readFields = isServiceOrg
            ? [
                { label: "Name", value: String(org?.name ?? "—") },
                { label: "Type", value: "Service Provider" },
                { label: "ID", value: orgId ?? "—", mono: true, small: true },
              ]
            : [
                { label: "Name", value: String(org?.name ?? "—") },
                { label: "Facility Code", value: String(org?.facility_code ?? "—") || "—", mono: true },
                { label: "Type", value: String(org?.organization_type ?? "—").replace("_", " "), capitalize: true },
                { label: "Ownership", value: String(org?.ownership_type ?? "—").replace("_", " "), capitalize: true },
                { label: "County", value: String(org?.county ?? "—") },
                { label: "Sub-county", value: String(org?.sub_county ?? "—") },
                { label: "Ward", value: String(org?.ward ?? "—") },
                { label: "Level", value: String(org?.level ?? "—") },
                { label: "Latitude", value: org?.lat != null ? String(org.lat) : "—", mono: true },
                { label: "Longitude", value: org?.lng != null ? String(org.lng) : "—", mono: true },
                { label: "ID", value: orgId ?? "—", mono: true, small: true },
              ];

          // ── facility edit helpers ─────────────────────────────────────────
          const countyOptions = countyOptionsQuery.data ?? [];
          const facilityForm: OrgEditFormState =
            editFormOverrides ?? (org ? mapOrgToEditForm(org) : defaultEditForm);
          const selectedCounty = countyOptions.find((c) => c.code === facilityForm.county);
          const subcountyOptions = selectedCounty?.subcounties ?? [];
          const selectedSubcounty = subcountyOptions.find((s) => s.name === facilityForm.subcounty);
          const wardOptions = selectedSubcounty?.wards ?? [];
          const setFacilityField = <K extends keyof OrgEditFormState>(key: K, value: OrgEditFormState[K]) =>
            setEditFormOverrides((prev) => ({ ...(prev ?? facilityForm), [key]: value }));

          // ── service edit helpers ──────────────────────────────────────────
          const serviceForm: ServiceOrgEditFormState =
            serviceOrgEditFormOverrides ?? (org ? mapOrgToServiceEditForm(org) : defaultServiceOrgEditForm);
          const setServiceField = <K extends keyof ServiceOrgEditFormState>(key: K, value: ServiceOrgEditFormState[K]) =>
            setServiceOrgEditFormOverrides((prev) => ({ ...(prev ?? serviceForm), [key]: value }));

          const cancelEdit = () => {
            setIsEditing(false);
            setEditFormOverrides(null);
            setServiceOrgEditFormOverrides(null);
            setEditValidationError(null);
          };

          return (
            <div>
              {orgDetailQuery.isLoading && <p className="org-empty text-sm">Loading details…</p>}
              {orgDetailQuery.isError && <p className="text-sm text-destructive">{formatError(orgDetailQuery.error)}</p>}

              {/* ── READ VIEW ── */}
              {org && !isEditing && (
                <>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {readFields.map(({ label, value, mono, capitalize, small }) => (
                      <div key={label} className="field">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
                        <p className={`mt-0.5 ${small ? "text-xs" : "text-sm"} ${mono ? "font-mono" : ""} ${capitalize ? "capitalize" : ""} text-slate-800`}>
                          {value}
                        </p>
                      </div>
                    ))}
                    {!isServiceOrg && (
                      <div className="field">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Transport</span>
                        <p className={`text-sm mt-0.5 font-semibold ${org.transport_available ? "text-emerald-700" : "text-slate-400"}`}>
                          {org.transport_available ? "✓ Available" : "—"}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-5">
                    <Button type="button" size="sm" onClick={() => { setEditFormOverrides(null); setServiceOrgEditFormOverrides(null); setIsEditing(true); }}>
                      Edit Details
                    </Button>
                  </div>
                </>
              )}

              {/* ── SERVICE ORG EDIT FORM ── */}
              {org && isEditing && isServiceOrg && (
                <form
                  className="grid gap-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setEditValidationError(null);
                    if (!serviceForm.service_name.trim()) {
                      setEditValidationError("Service name is required.");
                      return;
                    }
                    updateServiceOrgMutation.mutate({
                      serviceId: orgId!,
                      payload: {
                        service_name: serviceForm.service_name.trim(),
                        service_type: serviceForm.service_type.trim() || undefined,
                        availability: serviceForm.availability,
                        notes: serviceForm.notes.trim() || undefined,
                      },
                    });
                  }}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <label className="field">
                      <span>Service Name <span className="text-red-500">*</span></span>
                      <input className="field-input" required value={serviceForm.service_name}
                        onChange={(e) => setServiceField("service_name", e.target.value)} />
                    </label>
                    <label className="field">
                      <span>Service Type</span>
                      <input className="field-input" value={serviceForm.service_type}
                        onChange={(e) => setServiceField("service_type", e.target.value)} />
                    </label>
                  </div>
                  <label className="field">
                    <span>Availability</span>
                    <Select value={serviceForm.availability}
                      onValueChange={(v) => setServiceField("availability", v as ServiceOrgEditFormState["availability"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="limited">Limited</SelectItem>
                        <SelectItem value="unavailable">Unavailable</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="field">
                    <span>Notes</span>
                    <input className="field-input" value={serviceForm.notes}
                      onChange={(e) => setServiceField("notes", e.target.value)} />
                  </label>

                  {editValidationError && <p className="text-sm text-destructive">{editValidationError}</p>}
                  {updateServiceOrgMutation.isError && (
                    <p className="text-sm text-destructive">{formatError(updateServiceOrgMutation.error)}</p>
                  )}
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={updateServiceOrgMutation.isPending}>
                      {updateServiceOrgMutation.isPending ? "Saving…" : "Save Changes"}
                    </Button>
                    <Button type="button" size="sm" variant="outline" disabled={updateServiceOrgMutation.isPending} onClick={cancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {/* ── FACILITY EDIT FORM ── */}
              {org && isEditing && !isServiceOrg && (
                <form
                  className="grid gap-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setEditValidationError(null);
                    const payload = mapEditFormToPayload(facilityForm);
                    if (!payload) {
                      setEditValidationError("County, sub-county, ward, level, latitude, and longitude are required and must be valid numbers.");
                      return;
                    }
                    updateOrgMutation.mutate({ id: orgId!, payload });
                  }}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <label className="field">
                      <span>Name <span className="text-red-500">*</span></span>
                      <input className="field-input" required value={facilityForm.name}
                        onChange={(e) => setFacilityField("name", e.target.value)} />
                    </label>
                    <label className="field">
                      <span>Facility Code <span className="text-red-500">*</span></span>
                      <input className="field-input" required value={facilityForm.facility_code}
                        onChange={(e) => setFacilityField("facility_code", e.target.value)} />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="field">
                      <span>Organisation Type</span>
                      <Select value={facilityForm.organization_type}
                        onValueChange={(v) => setFacilityField("organization_type", v as OrgEditFormState["organization_type"])}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="facility">Facility</SelectItem>
                          <SelectItem value="service">Service</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="field">
                      <span>Ownership Type</span>
                      <Select value={facilityForm.ownership_type}
                        onValueChange={(v) => setFacilityField("ownership_type", v as OrgEditFormState["ownership_type"])}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="private">Private</SelectItem>
                          <SelectItem value="faith_based">Faith Based</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <label className="field">
                      <span>County</span>
                      <Select value={facilityForm.county || undefined}
                        onValueChange={(v) => setEditFormOverrides((prev) => ({ ...(prev ?? facilityForm), county: v, subcounty: "", ward: "" }))}>
                        <SelectTrigger><SelectValue placeholder="Select county" /></SelectTrigger>
                        <SelectContent>
                          {facilityForm.county && !selectedCounty && (
                            <SelectItem value={facilityForm.county}>{`County ${facilityForm.county}`}</SelectItem>
                          )}
                          {countyOptions.map((c) => (
                            <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="field">
                      <span>Sub-county</span>
                      <Select value={facilityForm.subcounty || undefined} disabled={!facilityForm.county}
                        onValueChange={(v) => setEditFormOverrides((prev) => ({ ...(prev ?? facilityForm), subcounty: v, ward: "" }))}>
                        <SelectTrigger><SelectValue placeholder="Select sub-county" /></SelectTrigger>
                        <SelectContent>
                          {subcountyOptions.map((s) => (
                            <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="field">
                      <span>Ward</span>
                      <Select value={facilityForm.ward || undefined} disabled={!facilityForm.subcounty}
                        onValueChange={(v) => setFacilityField("ward", v)}>
                        <SelectTrigger><SelectValue placeholder="Select ward" /></SelectTrigger>
                        <SelectContent>
                          {wardOptions.map((w) => (
                            <SelectItem key={w.name} value={w.name}>{w.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </label>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <label className="field">
                      <span>Level (1–6)</span>
                      <input className="field-input" type="number" min={1} max={6} required
                        value={facilityForm.level} onChange={(e) => setFacilityField("level", e.target.value)} />
                    </label>
                    <label className="field">
                      <span>Latitude</span>
                      <input className="field-input" type="number" step="any" required
                        value={facilityForm.lat} onChange={(e) => setFacilityField("lat", e.target.value)} />
                    </label>
                    <label className="field">
                      <span>Longitude</span>
                      <input className="field-input" type="number" step="any" required
                        value={facilityForm.lng} onChange={(e) => setFacilityField("lng", e.target.value)} />
                    </label>
                  </div>

                  <label className="field-checkbox" htmlFor="admin-transport">
                    <input id="admin-transport" type="checkbox" checked={facilityForm.transport_available}
                      onChange={(e) => setFacilityField("transport_available", e.target.checked)} />
                    <span className="text-sm">Transport available</span>
                  </label>

                  {editValidationError && <p className="text-sm text-destructive">{editValidationError}</p>}
                  {updateOrgMutation.isError && (
                    <p className="text-sm text-destructive">{formatError(updateOrgMutation.error)}</p>
                  )}
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={updateOrgMutation.isPending}>
                      {updateOrgMutation.isPending ? "Saving…" : "Save Changes"}
                    </Button>
                    <Button type="button" size="sm" variant="outline" disabled={updateOrgMutation.isPending} onClick={cancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          );
        })()}

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
            {services.length === 0 && !showAddService && (
              <p className="org-empty text-sm">No services registered yet.</p>
            )}
            {services.length > 0 && (
              <DataTable
                data={serviceRows}
                columns={serviceColumns}
                emptyMessage="No services registered yet."
                resultLabel="service"
              />
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
                    roleName: effectiveInviteRole,
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
                  <Select value={effectiveInviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {roleOptions.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
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
                <DataTable
                  data={pendingInviteRows}
                  columns={pendingInviteColumns}
                  emptyMessage="No pending invites."
                  resultLabel="invite"
                />
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
                <DataTable
                  data={memberRows}
                  columns={memberColumns}
                  emptyMessage="No members yet."
                  resultLabel="member"
                />
              )}
            </div>
          </div>
        )}
      </article>
    </section>
  );
}

export default AdminOrgPage;
