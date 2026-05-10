import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import { formatError } from "../../utils/format";
import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import type { ModelOrganization } from "../../types/organizations.generated";
import { useGetOrganizations } from "../../api/hooks/organizations/Organizations.hook";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "../../components/ui/breadcrumb";
import { Card, CardContent } from "../../components/ui/card";
import DataTable from "../../components/DataTable";
import { useAuthContext } from "../../context/useAuthContext";
import CreateFacilityDialog from "../../components/dialogs/CreateFacilityDialog";
import CreateServiceAccountDialog from "../../components/dialogs/CreateServiceAccountDialog";

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
   Main AdminPage
───────────────────────────────────────────── */

function AdminPage() {
  const { session, isAuthenticated, startImpersonation, impersonatedOrg } = useAuthContext();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const roles = session?.roles ?? [];
  const isSuperAdmin = roles.includes("SUPER_ADMIN");

  const [createModal, setCreateModal] = useState<null | "facility" | "service">(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const orgsQuery = useGetOrganizations(session?.accessToken, {
    enabled: isAuthenticated && isSuperAdmin,
  });

  const columns: ColumnDef<OrgRow>[] = [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) =>
          row.original.id ? (
            <button
              type="button"
              className="org-link text-left"
              onClick={() => navigate(`/${workspaceId}/admin/${row.original.id}`)}
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-ghost org-btn"
                onClick={() => navigate(`/${workspaceId}/admin/${row.original.id}`)}
              >
                Configure
              </button>
              <button
                type="button"
                className="btn btn-ghost org-btn"
                disabled={impersonatedOrg != null && String(impersonatedOrg.id) === row.original.id}
                onClick={() => {
                  startImpersonation(row.original as unknown as ModelOrganization);
                  navigate(`/${row.original.id}/dashboard`);
                }}
              >
                Impersonate
              </button>
            </div>
          ) : null,
      },
    ];

  const tableData: OrgRow[] = (orgsQuery.data ?? []).map((o) => ({
    id: String(o.id ?? ""),
    name: String(o.name ?? ""),
    facility_code: String(o.facility_code ?? ""),
    county: o.county ?? "",
    level: o.level ?? "",
    ownership_type: String(o.ownership_type ?? ""),
    organization_type: String((o as Record<string, unknown>).organization_type ?? "facility"),
    transport_available: Boolean((o as Record<string, unknown>).transport_available ?? false),
  }));

  const activeOrgTypeFilter =
    (columnFilters.find((f) => f.id === "organization_type")?.value as string) ?? "";

  const setOrgTypeFilter = (value: string) => {
    setColumnFilters((prev) => {
      const others = prev.filter((f) => f.id !== "organization_type");
      return value ? [...others, { id: "organization_type", value }] : others;
    });
  };

  if (!isAuthenticated) return <Navigate to="/signin" replace />;
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <section className="org-shell reveal delay-1">
      <Card>
        <CardContent className="flex items-end justify-between gap-3 px-5 py-4">
          <div className="flex flex-col gap-1">
            <p className="eyebrow">System Administration</p>
            <h1 className="font-heading text-2xl font-semibold -tracking-[0.03em] text-slate-900 sm:text-3xl">Admin Console</h1>
            <p className="text-sm text-slate-500">Manage organizations, service providers, and user access roles.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-ghost org-btn"
              onClick={() => setCreateModal("service")}
            >
              Create Service Provider
            </button>
            <button
              type="button"
              className="btn btn-primary org-btn"
              onClick={() => setCreateModal("facility")}
            >
              Create Facility Organization
            </button>
          </div>
        </CardContent>
      </Card>

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Admin</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

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
            <DataTable
              data={tableData}
              columns={columns}
              emptyMessage="No organizations found."
              resultLabel="organization"
              sorting={sorting}
              onSortingChange={setSorting}
              columnFilters={columnFilters}
              onColumnFiltersChange={setColumnFilters}
              sortableHeaders
              getRowClassName={() => "org-table-row-clickable"}
            />
          </>
        )}
      </article>

      <CreateFacilityDialog
        open={createModal === "facility"}
        onClose={() => setCreateModal(null)}
      />
      <CreateServiceAccountDialog
        open={createModal === "service"}
        onClose={() => setCreateModal(null)}
      />
    </section>
  );
}

export default AdminPage;
