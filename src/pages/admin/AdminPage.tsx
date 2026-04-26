import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { isAxiosError } from "axios";
import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  attachRoleToUser,
  createInvite,
  FACILITY_USER_GROUP_FILTERS,
  listFacilityUsers,
  listOrganizationMembers,
  listPendingInvites,
  type AuthGroupName,
  type AuthUser,
  type FacilityUserGroupFilter,
} from "../../api/authAdmin";
import {
  createOrganization,
  getOrganizationById,
  listOrganizations,
  type OrganizationCreateInput,
} from "../../api/organizations";
import {
  createOrganizationService,
  deleteServiceById,
  listOrganizationServices,
  type ServiceUpsertInput,
} from "../../api/services";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useAuthContext } from "../../context/useAuthContext";

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

function formatError(error: unknown): string {
  if (isAxiosError(error)) {
    const payload = error.response?.data;
    if (payload && typeof payload === "object" && "message" in payload) {
      const v = (payload as { message?: unknown }).message;
      if (typeof v === "string") return v;
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Request failed. Please try again.";
}

type OrgRow = {
  id: string;
  name: string;
  facility_code: string;
  county: string | number;
  level: number | string;
  ownership_type: string;
  organization_type: string;
  transport_available: boolean;
};

type OrgDetailTab = "details" | "services" | "team";

/* ─────────────────────────────────────────────
   County data types
───────────────────────────────────────────── */

type WardOption = { name: string };
type SubcountyOption = { name: string; wards: WardOption[] };
type CountyOption = { name: string; code: string; subcounties: SubcountyOption[] };

/* ─────────────────────────────────────────────
   Org type badge
───────────────────────────────────────────── */

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

/* ─────────────────────────────────────────────
   Create Facility Dialog
───────────────────────────────────────────── */

type OrgFormState = {
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
};

const defaultOrgForm: OrgFormState = {
  name: "", facility_code: "", county: "", subcounty: "", ward: "",
  transport_available: false, level: "", lat: "", lng: "", ownership_type: "public",
};

function CreateFacilityDialog({
  open,
  onClose,
  countyOptions,
}: {
  open: boolean;
  onClose: () => void;
  countyOptions: CountyOption[];
}) {
  const { session } = useAuthContext();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<OrgFormState>(defaultOrgForm);
  const [validationError, setValidationError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (payload: OrganizationCreateInput) =>
      createOrganization(payload, session?.accessToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      setForm(defaultOrgForm);
      setValidationError(null);
      onClose();
    },
  });

  const handleClose = () => {
    setForm(defaultOrgForm);
    setValidationError(null);
    createMutation.reset();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setValidationError(null);
    const county = Number(form.county);
    const level = Number(form.level);
    if ([county, level].some(Number.isNaN) || !form.subcounty || !form.ward) {
      setValidationError("County, sub-county, ward, and level are required.");
      return;
    }
    createMutation.mutate({
      name: form.name.trim(),
      facility_code: form.facility_code.trim(),
      county,
      sub_county: form.subcounty,
      ward: form.ward,
      transport_available: form.transport_available,
      level,
      lat: form.lat !== "" ? Number(form.lat) : 0,
      lng: form.lng !== "" ? Number(form.lng) : 0,
      ownership_type: form.ownership_type,
      organization_type: "facility",
    });
  };

  const selectedCounty = countyOptions.find((c) => c.code === form.county);
  const subcountyOptions = selectedCounty?.subcounties ?? [];
  const selectedSubcounty = subcountyOptions.find((s) => s.name === form.subcounty);
  const wardOptions = selectedSubcounty?.wards ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="min-w-2/4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create Facility</DialogTitle>
          <DialogDescription>
            Register a new healthcare facility. Fields marked <span className="text-red-500">*</span> are required.
          </DialogDescription>
        </DialogHeader>
        <form className="org-form" onSubmit={handleSubmit}>
          <div className="org-grid">
            <label className="field">
              <span>Facility Name <span className="text-red-500" aria-hidden>*</span></span>
              <input className="field-input" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            </label>
            <label className="field">
              <span>Facility Code <span className="text-red-500" aria-hidden>*</span></span>
              <input className="field-input" value={form.facility_code} onChange={(e) => setForm((p) => ({ ...p, facility_code: e.target.value }))} required />
            </label>
          </div>
          <div className="org-grid">
            <label className="field">
              <span>County <span className="text-red-500" aria-hidden>*</span></span>
              <Select value={form.county || undefined} onValueChange={(v) => setForm((p) => ({ ...p, county: v, subcounty: "", ward: "" }))}>
                <SelectTrigger><SelectValue placeholder="Select county" /></SelectTrigger>
                <SelectContent>
                  {countyOptions.map((c) => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </label>
            <label className="field">
              <span>Level (1–6) <span className="text-red-500" aria-hidden>*</span></span>
              <input className="field-input" type="number" min={1} max={6} value={form.level} onChange={(e) => setForm((p) => ({ ...p, level: e.target.value }))} required />
            </label>
          </div>
          <div className="org-grid">
            <label className="field">
              <span>Sub-county <span className="text-red-500" aria-hidden>*</span></span>
              <Select value={form.subcounty || undefined} onValueChange={(v) => setForm((p) => ({ ...p, subcounty: v, ward: "" }))} disabled={!form.county}>
                <SelectTrigger><SelectValue placeholder="Select sub-county" /></SelectTrigger>
                <SelectContent>
                  {subcountyOptions.map((s) => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </label>
            <label className="field">
              <span>Ward <span className="text-red-500" aria-hidden>*</span></span>
              <Select value={form.ward || undefined} onValueChange={(v) => setForm((p) => ({ ...p, ward: v }))} disabled={!form.subcounty}>
                <SelectTrigger><SelectValue placeholder="Select ward" /></SelectTrigger>
                <SelectContent>
                  {wardOptions.map((w) => <SelectItem key={w.name} value={w.name}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </label>
          </div>
          <div className="org-grid">
            <label className="field">
              <span>Latitude</span>
              <input className="field-input" type="number" step="any" value={form.lat} onChange={(e) => setForm((p) => ({ ...p, lat: e.target.value }))} />
            </label>
            <label className="field">
              <span>Longitude</span>
              <input className="field-input" type="number" step="any" value={form.lng} onChange={(e) => setForm((p) => ({ ...p, lng: e.target.value }))} />
            </label>
          </div>
          <div className="org-grid">
            <label className="field">
              <span>Ownership Type</span>
              <Select value={form.ownership_type} onValueChange={(v) => setForm((p) => ({ ...p, ownership_type: v as OrgFormState["ownership_type"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="faith_based">Faith Based</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <div className="field">
              <span>Transportation</span>
              <label className="field-checkbox">
                <input type="checkbox" checked={form.transport_available} onChange={(e) => setForm((p) => ({ ...p, transport_available: e.target.checked }))} />
                <span>Transportation available</span>
              </label>
            </div>
          </div>
          {validationError && <p className="text-sm text-destructive">{validationError}</p>}
          {createMutation.isError && <p className="text-sm text-destructive">{formatError(createMutation.error)}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create Facility"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────
   Create Service Provider Dialog
───────────────────────────────────────────── */

function CreateServiceProviderDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { session } = useAuthContext();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const createMutation = useMutation({
    mutationFn: (payload: OrganizationCreateInput) =>
      createOrganization(payload, session?.accessToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      setName("");
      onClose();
    },
  });

  const handleClose = () => {
    setName("");
    createMutation.reset();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    createMutation.mutate({
      name: name.trim(),
      organization_type: "service",
      facility_code: "",
      county: 0,
      sub_county: "",
      ward: "",
      transport_available: false,
      level: 0,
      lat: 0,
      lng: 0,
      ownership_type: "public",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Service Provider</DialogTitle>
          <DialogDescription>
            Register a service provider organisation for referral management.
          </DialogDescription>
        </DialogHeader>
        <form className="org-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Name <span className="text-red-500" aria-hidden>*</span></span>
            <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          {createMutation.isError && <p className="text-sm text-destructive">{formatError(createMutation.error)}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create Service Provider"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────
   User role helpers
───────────────────────────────────────────── */

function inferDefaultGroup(user: AuthUser): AuthGroupName {
  const groups = user.groups.map((g) => g.trim().toUpperCase());
  if (groups.includes("HOSPITAL_ADMIN")) return "HOSPITAL_ADMIN";
  if (groups.includes("DOCTOR")) return "DOCTOR";
  return "NURSE";
}

const GROUP_FILTER_LABELS: Record<FacilityUserGroupFilter, string> = {
  none: "None",
  all: "All",
  hospital_admin: "Hospital Admin",
  doctor: "Doctor",
  nurse: "Nurse",
};

/* ─────────────────────────────────────────────
   Main AdminPage
───────────────────────────────────────────── */

type AdminTab = "organizations" | "users";

const defaultAddServiceForm: ServiceUpsertInput = {
  service_name: "",
  service_type: "",
  availability: "available",
  notes: "",
};

function AdminPage() {
  const { session, isAuthenticated } = useAuthContext();
  const roles = session?.roles ?? [];
  const isSuperAdmin = roles.includes("SUPER_ADMIN");
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<AdminTab>("organizations");
  const [createModal, setCreateModal] = useState<null | "facility" | "service">(null);
  const [selectedOrg, setSelectedOrg] = useState<OrgRow | null>(null);
  const [orgDetailTab, setOrgDetailTab] = useState<OrgDetailTab>("details");

  // ── Services sub-state ──
  const [showAddService, setShowAddService] = useState(false);
  const [addServiceForm, setAddServiceForm] = useState<ServiceUpsertInput>(defaultAddServiceForm);

  // ── Team sub-state ──
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("HOSPITAL_ADMIN");
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // ── Org DataTable state ──
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // ── User roles state ──
  const [selectedGroupByUsername, setSelectedGroupByUsername] = useState<Record<string, AuthGroupName>>({});
  const [selectedUserGroupFilter, setSelectedUserGroupFilter] = useState<FacilityUserGroupFilter>("none");
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);

  // ── County data ──
  const countyOptionsQuery = useQuery({
    queryKey: ["kenya-administrative-units"],
    queryFn: async (): Promise<CountyOption[]> => {
      const res = await fetch("/kenya-administrative-units.json", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load county data.");
      return (await res.json()) as CountyOption[];
    },
    staleTime: Infinity,
  });

  // ── Organizations query ──
  const orgsQuery = useQuery({
    queryKey: ["organizations", session?.accessToken],
    queryFn: () => listOrganizations(session?.accessToken),
    enabled: isAuthenticated && isSuperAdmin,
  });

  // ── Users query ──
  const usersQuery = useQuery({
    queryKey: ["auth-users", session?.accessToken, session?.facilityId, selectedUserGroupFilter],
    queryFn: () =>
      listFacilityUsers(session?.facilityId ?? "", selectedUserGroupFilter, session?.accessToken),
    enabled: isAuthenticated && isSuperAdmin && Boolean(session?.facilityId) && activeTab === "users",
  });

  const attachRoleMutation = useMutation({
    mutationFn: ({ username, groupName }: { username: string; groupName: AuthGroupName }) =>
      attachRoleToUser({ username, groupName }, session?.accessToken),
    onSuccess: async (_data, variables) => {
      setLastActionMessage(`Updated ${variables.username} to ${variables.groupName}.`);
      await queryClient.invalidateQueries({ queryKey: ["auth-users"] });
    },
  });

  // ── Org detail queries ──
  const orgDetailQuery = useQuery({
    queryKey: ["admin-org-detail", selectedOrg?.id, session?.accessToken],
    queryFn: () => getOrganizationById(selectedOrg!.id, session?.accessToken),
    enabled: isAuthenticated && isSuperAdmin && Boolean(selectedOrg?.id),
    staleTime: 5 * 60 * 1000,
  });

  const orgServicesQuery = useQuery({
    queryKey: ["admin-org-services", selectedOrg?.id, session?.accessToken],
    queryFn: () => listOrganizationServices(selectedOrg!.id, session?.accessToken),
    enabled: isAuthenticated && isSuperAdmin && Boolean(selectedOrg?.id),
  });

  const pendingInvitesQuery = useQuery({
    queryKey: ["admin-org-invites", selectedOrg?.id, session?.accessToken],
    queryFn: () => listPendingInvites(selectedOrg!.id, session?.accessToken),
    enabled: isAuthenticated && isSuperAdmin && Boolean(selectedOrg?.id) && orgDetailTab === "team",
  });

  const orgMembersQuery = useQuery({
    queryKey: ["admin-org-members", selectedOrg?.id, session?.accessToken],
    queryFn: () => listOrganizationMembers(selectedOrg!.id, session?.accessToken),
    enabled: isAuthenticated && isSuperAdmin && Boolean(selectedOrg?.id) && orgDetailTab === "team",
  });

  // ── Org detail mutations ──
  const addServiceMutation = useMutation({
    mutationFn: (payload: ServiceUpsertInput) =>
      createOrganizationService(selectedOrg!.id, payload, session?.accessToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-org-services", selectedOrg?.id] });
      setAddServiceForm(defaultAddServiceForm);
      setShowAddService(false);
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (serviceId: string) => deleteServiceById(serviceId, session?.accessToken),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin-org-services", selectedOrg?.id] }),
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      createInvite(
        {
          organizationId: selectedOrg!.id,
          organizationName: selectedOrg!.name,
          roleName: inviteRole,
          targetEmail: inviteEmail.trim(),
        },
        session?.accessToken,
      ),
    onSuccess: async () => {
      setInviteSuccess(`Invite sent to ${inviteEmail.trim()}.`);
      setInviteEmail("");
      setInviteRole("HOSPITAL_ADMIN");
      await queryClient.invalidateQueries({ queryKey: ["admin-org-invites", selectedOrg?.id] });
    },
  });

  // ── Table columns ──
  const columns = useMemo<ColumnDef<OrgRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) =>
          row.original.id ? (
            <button
              type="button"
              className="org-link text-left"
              onClick={() => { setSelectedOrg(row.original); setOrgDetailTab("details"); }}
            >
              {row.getValue("name")}
            </button>
          ) : (
            <span>{row.getValue("name")}</span>
          ),
      },
      {
        accessorKey: "facility_code",
        header: "Code",
        cell: ({ row }) => <code className="text-xs">{row.getValue("facility_code") || "—"}</code>,
      },
      {
        accessorKey: "organization_type",
        header: "Type",
        cell: ({ row }) => <OrgTypeBadge type={row.getValue("organization_type")} />,
        filterFn: "equals",
      },
      {
        accessorKey: "ownership_type",
        header: "Ownership",
        cell: ({ row }) => {
          const v: string = row.getValue("ownership_type") ?? "";
          return <span className="capitalize">{v.replace("_", " ")}</span>;
        },
      },
      {
        accessorKey: "level",
        header: "Level",
      },
      {
        accessorKey: "transport_available",
        header: "Transport",
        cell: ({ row }) =>
          row.getValue("transport_available") ? (
            <span className="text-emerald-700 font-semibold">✓ Yes</span>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) =>
          row.original.id ? (
            <button
              type="button"
              className="btn btn-ghost org-btn"
              onClick={() => { setSelectedOrg(row.original); setOrgDetailTab("details"); }}
            >
              Configure
            </button>
          ) : null,
      },
    ],
    [],
  );

  const tableData = useMemo<OrgRow[]>(
    () =>
      (orgsQuery.data ?? []).map((o) => ({
        id: String(o.id ?? ""),
        name: String(o.name ?? ""),
        facility_code: String(o.facility_code ?? ""),
        county: o.county ?? "",
        level: o.level ?? "",
        ownership_type: String(o.ownership_type ?? ""),
        organization_type: String((o as Record<string, unknown>).organization_type ?? "facility"),
        transport_available: Boolean((o as Record<string, unknown>).transport_available ?? false),
      })),
    [orgsQuery.data],
  );

  const table = useReactTable({
    data: tableData,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const activeOrgTypeFilter =
    (columnFilters.find((f) => f.id === "organization_type")?.value as string) ?? "";

  const setOrgTypeFilter = (value: string) => {
    setColumnFilters((prev) => {
      const others = prev.filter((f) => f.id !== "organization_type");
      return value ? [...others, { id: "organization_type", value }] : others;
    });
  };

  const resolveSelectedRole = (user: AuthUser): AuthGroupName =>
    selectedGroupByUsername[user.username] ?? inferDefaultGroup(user);

  const handleAttachRole = (user: AuthUser) => {
    setLastActionMessage(null);
    attachRoleMutation.mutate({ username: user.username, groupName: resolveSelectedRole(user) });
  };

  if (!isAuthenticated) return <Navigate to="/signin" replace />;
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;

  // ── Derive full org for details tab ──
  const fullOrg = orgDetailQuery.data as Record<string, unknown> | undefined;

  return (
    <section className="org-shell reveal delay-1">
      <div className="org-header">
        <div>
          <p className="eyebrow">System Administration</p>
          <h1>Admin Console</h1>
          <p>Manage organizations, service providers, and user access roles.</p>
        </div>
        {activeTab === "organizations" && !selectedOrg && (
          <div className="org-actions">
            <button
              type="button"
              className="btn btn-ghost org-btn"
              onClick={() => setCreateModal("service")}
            >
              + Service Provider
            </button>
            <button
              type="button"
              className="btn btn-primary org-btn"
              onClick={() => setCreateModal("facility")}
            >
              + Create Facility
            </button>
          </div>
        )}
      </div>

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            {selectedOrg ? (
              <BreadcrumbLink href="#" onClick={(e) => { e.preventDefault(); setSelectedOrg(null); }}>
                Admin
              </BreadcrumbLink>
            ) : (
              <BreadcrumbPage>Admin</BreadcrumbPage>
            )}
          </BreadcrumbItem>
          {selectedOrg && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="#" onClick={(e) => { e.preventDefault(); setSelectedOrg(null); }}>
                  Organizations
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{selectedOrg.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Top-level tab switcher — hidden in org detail view */}
      {!selectedOrg && (
        <div className="inline-flex gap-1 rounded-xl border border-[rgba(10,45,55,0.13)] bg-[rgba(255,255,255,0.7)] p-1">
          {(["organizations", "users"] as AdminTab[]).map((tab) => (
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
              {tab === "organizations" ? "Organizations" : "User Roles"}
            </button>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════
          CONFIGURE ORGANISATION (tabbed detail)
      ══════════════════════════════════════ */}
      {activeTab === "organizations" && selectedOrg && (
        <article className="org-table-card">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <button type="button" className="btn btn-ghost org-btn" onClick={() => setSelectedOrg(null)}>
              ← Back
            </button>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{selectedOrg.name}</h2>
              <OrgTypeBadge type={selectedOrg.organization_type} />
            </div>
          </div>

          {/* Tab bar */}
          <div className="inline-flex gap-1 rounded-xl border border-[rgba(10,45,55,0.13)] bg-[rgba(255,255,255,0.7)] p-1 mb-5">
            {(["details", "services", "team"] as OrgDetailTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setOrgDetailTab(tab)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition-all ${
                  orgDetailTab === tab
                    ? "bg-white shadow-sm text-[#0a5240]"
                    : "text-[#4a6373] hover:text-[#0a5240]"
                }`}
              >
                {tab === "details" ? "Organisation Details" : tab === "services" ? "Services" : "Team"}
              </button>
            ))}
          </div>

          {/* ── DETAILS TAB ── */}
          {orgDetailTab === "details" && (
            <div>
              {orgDetailQuery.isLoading && <p className="org-empty text-sm">Loading details…</p>}
              {orgDetailQuery.isError && <p className="text-sm text-destructive">{formatError(orgDetailQuery.error)}</p>}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="field">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</span>
                  <p className="text-sm text-slate-800 mt-0.5">{String(fullOrg?.name ?? selectedOrg.name)}</p>
                </div>
                <div className="field">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Facility Code</span>
                  <p className="text-sm font-mono text-slate-800 mt-0.5">{String(fullOrg?.facility_code ?? selectedOrg.facility_code) || "—"}</p>
                </div>
                <div className="field">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type</span>
                  <p className="text-sm text-slate-800 mt-0.5 capitalize">
                    {String(fullOrg?.organization_type ?? selectedOrg.organization_type).replace("_", " ")}
                  </p>
                </div>
                <div className="field">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ownership</span>
                  <p className="text-sm text-slate-800 capitalize mt-0.5">
                    {String((fullOrg?.ownership_type ?? selectedOrg.ownership_type) || "—").replace("_", " ")}
                  </p>
                </div>
                <div className="field">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">County</span>
                  <p className="text-sm text-slate-800 mt-0.5">{String((fullOrg?.county ?? selectedOrg.county) || "—")}</p>
                </div>
                <div className="field">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sub-county</span>
                  <p className="text-sm text-slate-800 mt-0.5">{String(fullOrg?.sub_county ?? "—")}</p>
                </div>
                <div className="field">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ward</span>
                  <p className="text-sm text-slate-800 mt-0.5">{String(fullOrg?.ward ?? "—")}</p>
                </div>
                <div className="field">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Level</span>
                  <p className="text-sm text-slate-800 mt-0.5">{String((fullOrg?.level ?? selectedOrg.level) || "—")}</p>
                </div>
                <div className="field">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Transport</span>
                  <p className={`text-sm mt-0.5 font-semibold ${(fullOrg?.transport_available ?? selectedOrg.transport_available) ? "text-emerald-700" : "text-slate-400"}`}>
                    {(fullOrg?.transport_available ?? selectedOrg.transport_available) ? "✓ Available" : "—"}
                  </p>
                </div>
                <div className="field">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Latitude</span>
                  <p className="text-sm font-mono text-slate-800 mt-0.5">{fullOrg?.lat != null ? String(fullOrg.lat) : "—"}</p>
                </div>
                <div className="field">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Longitude</span>
                  <p className="text-sm font-mono text-slate-800 mt-0.5">{fullOrg?.lng != null ? String(fullOrg.lng) : "—"}</p>
                </div>
                <div className="field">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">ID</span>
                  <p className="text-xs font-mono text-slate-400 mt-0.5 break-all">{selectedOrg.id}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── SERVICES TAB ── */}
          {orgDetailTab === "services" && (
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
                      service_name: addServiceForm.service_name?.trim() ?? "",
                      service_type: addServiceForm.service_type?.trim() ?? "",
                      availability: addServiceForm.availability,
                      notes: addServiceForm.notes?.trim() ?? "",
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
                        setAddServiceForm((p) => ({
                          ...p,
                          availability: v as "available" | "limited" | "unavailable",
                        }))
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
              {orgServicesQuery.data && orgServicesQuery.data.length === 0 && !showAddService && (
                <p className="org-empty text-sm">No services registered yet.</p>
              )}
              {orgServicesQuery.data && orgServicesQuery.data.length > 0 && (
                <div className="org-table-wrap">
                  <table className="org-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Notes</th>
                        <th>Available</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {orgServicesQuery.data.map((svc) => (
                        <tr key={svc.id ?? svc.service_name}>
                          <td className="font-medium">{svc.service_name ?? "—"}</td>
                          <td>{svc.service_type ?? "—"}</td>
                          <td className="text-slate-500">{svc.notes ?? "—"}</td>
                          <td>
                            {svc.availability ? (
                              <span className="text-emerald-700 font-semibold">✓ Yes</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
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
          {orgDetailTab === "team" && (
            <div className="space-y-8">
              {/* Invite form */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-3">Invite User</h3>
                <form
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4 grid gap-3 max-w-lg"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setInviteSuccess(null);
                    inviteMutation.mutate();
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
                  {inviteMutation.isError && (
                    <p className="text-sm text-destructive">{formatError(inviteMutation.error)}</p>
                  )}
                  {inviteSuccess && (
                    <p className="text-sm font-semibold text-emerald-700">{inviteSuccess}</p>
                  )}
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" disabled={inviteMutation.isPending}>
                      {inviteMutation.isPending ? "Sending…" : "Send Invite"}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Pending invites */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-3">Pending Invites</h3>
                {pendingInvitesQuery.isLoading && <p className="org-empty text-sm">Loading invites…</p>}
                {pendingInvitesQuery.isError && (
                  <p className="text-sm text-destructive">{formatError(pendingInvitesQuery.error)}</p>
                )}
                {pendingInvitesQuery.data && pendingInvitesQuery.data.length === 0 && (
                  <p className="org-empty text-sm">No pending invites.</p>
                )}
                {pendingInvitesQuery.data && pendingInvitesQuery.data.length > 0 && (
                  <div className="org-table-wrap">
                    <table className="org-table">
                      <thead>
                        <tr>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Sent</th>
                          <th>Accepted</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingInvitesQuery.data.map((invite) => (
                          <tr key={invite.id}>
                            <td>{invite.targetEmail ?? "—"}</td>
                            <td className="capitalize">{invite.roleName ?? "—"}</td>
                            <td>
                              {invite.sent
                                ? <span className="text-emerald-700 font-semibold">✓ Yes</span>
                                : <span className="text-slate-400">—</span>}
                            </td>
                            <td>
                              {invite.accepted
                                ? <span className="text-emerald-700 font-semibold">✓ Yes</span>
                                : <span className="text-slate-400">No</span>}
                            </td>
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

              {/* Members */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-3">Members</h3>
                {orgMembersQuery.isLoading && <p className="org-empty text-sm">Loading members…</p>}
                {orgMembersQuery.isError && (
                  <p className="text-sm text-destructive">{formatError(orgMembersQuery.error)}</p>
                )}
                {orgMembersQuery.data && orgMembersQuery.data.length === 0 && (
                  <p className="org-empty text-sm">No members yet.</p>
                )}
                {orgMembersQuery.data && orgMembersQuery.data.length > 0 && (
                  <div className="org-table-wrap">
                    <table className="org-table">
                      <thead>
                        <tr>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Since</th>
                        </tr>
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
      )}

      {/* ══════════════════════════════════════
          ORGANIZATIONS TABLE
      ══════════════════════════════════════ */}
      {activeTab === "organizations" && !selectedOrg && (
        <article className="org-table-card">
          <div className="org-table-tools referrals-table-tools mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#375163]">Filter by type</span>
              {["", "facility", "service"].map((type) => (
                <button
                  key={type || "all"}
                  type="button"
                  onClick={() => setOrgTypeFilter(type)}
                  className={`rounded-full border px-3 py-1 text-xs font-bold transition-all ${
                    activeOrgTypeFilter === type
                      ? "border-[#117a65] bg-[rgba(17,122,101,0.1)] text-[#0a5240]"
                      : "border-[rgba(10,45,55,0.15)] bg-white text-[#375163] hover:border-[#117a65]/40"
                  }`}
                >
                  {type === "" ? "All" : type === "facility" ? "Facility" : "Service Provider"}
                </button>
              ))}
            </div>
          </div>

          {orgsQuery.isLoading && <p className="org-empty">Loading organizations…</p>}
          {orgsQuery.isError && <p className="text-sm text-destructive">{formatError(orgsQuery.error)}</p>}

          {orgsQuery.data && (
            <>
              <div className="org-table-wrap">
                <Table className="org-table">
                  <TableHeader>
                    {table.getHeaderGroups().map((hg) => (
                      <TableRow key={hg.id}>
                        {hg.headers.map((header) => (
                          <TableHead
                            key={header.id}
                            onClick={header.column.getToggleSortingHandler()}
                            className={header.column.getCanSort() ? "cursor-pointer select-none" : ""}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getIsSorted() === "asc" ? " ↑" : header.column.getIsSorted() === "desc" ? " ↓" : ""}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.length > 0 ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id} className="org-table-row-clickable">
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="text-center py-8">
                          <p className="org-empty">No organizations found.</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="facilities-pagination mt-3">
                <p className="facilities-page-indicator">
                  Page {table.getState().pagination.pageIndex + 1} of{" "}
                  {Math.max(1, table.getPageCount())} &nbsp;·&nbsp;{" "}
                  {table.getFilteredRowModel().rows.length} total
                </p>
                <div className="facilities-pagination-actions">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </article>
      )}

      {/* ══════════════════════════════════════
          USER ROLES TAB
      ══════════════════════════════════════ */}
      {activeTab === "users" && (
        <article className="org-table-card">
          <div className="org-table-tools mb-3">
            <label className="org-filter-control">
              Group filter
              <Select
                value={selectedUserGroupFilter}
                onValueChange={(v) => setSelectedUserGroupFilter(v as FacilityUserGroupFilter)}
              >
                <SelectTrigger className="org-filter-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FACILITY_USER_GROUP_FILTERS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {GROUP_FILTER_LABELS[g]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>

          {!session?.facilityId && (
            <article className="access-note error-block">
              <h2>Missing facility ID</h2>
              <p>Could not resolve `facility_id` from your session token.</p>
            </article>
          )}

          {usersQuery.isLoading && (
            <article className="access-note">
              <h2>Loading users</h2>
              <p>Fetching users from the authentication service…</p>
            </article>
          )}
          {usersQuery.isError && (
            <article className="access-note error-block">
              <h2>Could not load users</h2>
              <p>{formatError(usersQuery.error)}</p>
            </article>
          )}

          {usersQuery.data && (
            <div className="org-table-wrap">
              {usersQuery.data.length === 0 ? (
                <p className="org-empty">No users found.</p>
              ) : (
                <table className="org-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Current Groups</th>
                      <th>Assign Role</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersQuery.data.map((user) => (
                      <tr key={user.username}>
                        <td>{user.username}</td>
                        <td>{user.email ?? "—"}</td>
                        <td>{user.status ?? (user.enabled ? "ENABLED" : "—")}</td>
                        <td>{user.groups.length > 0 ? user.groups.join(", ") : "—"}</td>
                        <td>
                          <Select
                            value={resolveSelectedRole(user)}
                            onValueChange={(v) =>
                              setSelectedGroupByUsername((prev) => ({
                                ...prev,
                                [user.username]: v as AuthGroupName,
                              }))
                            }
                          >
                            <SelectTrigger className="user-role-select"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="HOSPITAL_ADMIN">HOSPITAL_ADMIN</SelectItem>
                              <SelectItem value="DOCTOR">DOCTOR</SelectItem>
                              <SelectItem value="NURSE">NURSE</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {attachRoleMutation.isError && (
            <p className="result-note error-note">{formatError(attachRoleMutation.error)}</p>
          )}
          {lastActionMessage && (
            <p className="result-note success-note">{lastActionMessage}</p>
          )}
        </article>
      )}

      {/* Dialogs */}
      <CreateFacilityDialog
        open={createModal === "facility"}
        onClose={() => setCreateModal(null)}
        countyOptions={countyOptionsQuery.data ?? []}
      />
      <CreateServiceProviderDialog
        open={createModal === "service"}
        onClose={() => setCreateModal(null)}
      />
    </section>
  );
}

export default AdminPage;
