import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, Search } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWorkspace } from "../../../context/WorkspaceContext";
import { useGetOrganizationById } from "../../../api/hooks/organizations/OrganizationById.hook";
import { useGetFacilityReferrals } from "../../../api/hooks/referrals/FacilityReferrals.hook";
import Breadcrumbs from "../../../components/Breadcrumbs";
import DataTable from "../../../components/DataTable";
import { PriorityBadge, StatusBadge } from "../../../components/ReferralBadges";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { useAuthContext } from "../../../context/useAuthContext";
import type { ModelsReferral, ModelsReferralStatus } from "../../../types/referrals.generated";
import { formatError, formatDateTime } from "../../../utils/format";

type StatusFilter = "all" | ModelsReferralStatus;

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" as ModelsReferralStatus },
  { label: "Accepted", value: "accepted" as ModelsReferralStatus },
  { label: "Cancelled", value: "cancelled" as ModelsReferralStatus },
  { label: "Closed", value: "closed" as ModelsReferralStatus },
];

function SortableHeader({
  label,
  column,
}: {
  label: string;
  column: { getToggleSortingHandler: () => ((e: unknown) => void) | undefined; getIsSorted: () => false | "asc" | "desc" };
}) {
  return (
    <button
      type="button"
      className="flex items-center gap-1 font-semibold hover:text-slate-900 transition-colors"
      onClick={column.getToggleSortingHandler()}
    >
      {label}
      <ArrowUpDown className="size-3.5 text-slate-400" />
    </button>
  );
}

function FacilityReferralsPage() {
  const { workspaceId: organizationId } = useWorkspace();
  const { session } = useAuthContext();
  const navigate = useNavigate();
  
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const organizationQuery = useGetOrganizationById(organizationId, session?.accessToken, {
    enabled: organizationId.length > 0,
  });

  const facilityCode = organizationQuery.data?.facility_code?.trim() ?? "";

  const facilityReferralsQuery = useGetFacilityReferrals(
    facilityCode,
    { status: statusFilter === "all" ? undefined : statusFilter },
    session?.accessToken,
    { enabled: facilityCode.length > 0  },
  );

  const columns: ColumnDef<ModelsReferral>[] = [
      {
        accessorKey: "referralCode",
        header: ({ column }) => <SortableHeader label="Code" column={column} />,
        cell: ({ row }) => (
          <button
            type="button"
            className="font-mono text-xs font-semibold text-sky-700 hover:text-sky-900 hover:underline transition-colors"
            onClick={() =>
              navigate(`/${organizationId}/referrals/facility/${encodeURIComponent(row.original.referralCode ?? "")}`)
            }
          >
            {row.getValue("referralCode") || "—"}
          </button>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
        filterFn: "equals",
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => <PriorityBadge priority={row.getValue("priority")} />,
      },
      {
        accessorKey: "serviceType",
        header: ({ column }) => <SortableHeader label="Service" column={column} />,
        cell: ({ row }) => (
          <span className="text-sm text-slate-700">{row.getValue("serviceType") || "—"}</span>
        ),
      },
      {
        accessorKey: "originFacilityCode",
        header: "Origin",
        cell: ({ row }) => (
          <code className="text-xs text-slate-600">{row.getValue("originFacilityCode") || "—"}</code>
        ),
      },
      {
        accessorKey: "acceptedByFacilityCode",
        header: "Accepted By",
        cell: ({ row }) => (
          <code className="text-xs text-slate-600">{row.getValue("acceptedByFacilityCode") || "—"}</code>
        ),
      },
      {
        id: "raisedBy",
        header: "Raised By",
        accessorFn: (row) => row.raisedByUsername ?? row.raisedBySub ?? "",
        cell: ({ getValue }) => (
          <span className="text-sm text-slate-600">{(getValue() as string) || "—"}</span>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: ({ column }) => <SortableHeader label="Updated" column={column} />,
        cell: ({ row }) => (
          <span className="text-xs text-slate-500">{formatDateTime(row.getValue("updatedAt"))}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const code = row.original.referralCode?.trim() ?? "";
          return (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!code}
              onClick={() =>
                navigate(`/${organizationId}/referrals/facility/${encodeURIComponent(code)}`)
              }
            >
              View
            </Button>
          );
        },
      },
    ];

  const tableData: ModelsReferral[] = facilityReferralsQuery.data ?? [];

  const facilityName = organizationQuery.data?.name ?? organizationQuery.data?.facility_code ?? "Facility";

  return (
    <section className="org-shell reveal delay-1">
      <Card>
        <CardContent className="flex items-start justify-between gap-3 px-5 py-4">
          <div className="flex flex-col gap-1">
            <p className="eyebrow">Referrals</p>
            <h1 className="font-heading text-2xl font-semibold -tracking-[0.03em] text-slate-900 sm:text-3xl">
              Facility Referrals
            </h1>
            <p className="text-sm text-slate-500">
              Referrals created by or accepted by this facility.
            </p>
          </div>
          <Link className="btn btn-primary org-btn shrink-0" to={`/${organizationId}/referrals/create`}>
            Create Referral
          </Link>
        </CardContent>
      </Card>

      <Breadcrumbs
        items={[
          { label: facilityName, to: `/${organizationId}/organization` },
          { label: "Facility Referrals" },
        ]}
      />

      {organizationQuery.isError && (
        <article className="access-note error-block">
          <h2>Could not load facility</h2>
          <p>{formatError(organizationQuery.error)}</p>
        </article>
      )}
      {organizationQuery.data && !facilityCode && (
        <article className="access-note error-block">
          <h2>Missing facility code</h2>
          <p>This facility does not have a facility code, so referrals cannot be loaded.</p>
        </article>
      )}

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Status filter pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {STATUS_OPTIONS.map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                    statusFilter === value
                      ? "border-emerald-700/40 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Global search */}
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-3 size-3.5 text-slate-400" />
              <Input
                className="h-8 pl-8 text-sm w-56"
                placeholder="Search referrals…"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          {facilityReferralsQuery.isLoading && (
            <p className="org-empty py-8">Loading facility referrals…</p>
          )}
          {facilityReferralsQuery.isError && (
            <p className="result-note error-note">{formatError(facilityReferralsQuery.error)}</p>
          )}

          {facilityReferralsQuery.data !== undefined && (
            <>
              <DataTable
                data={tableData}
                columns={columns}
                resultLabel="referral"
                emptyMessage="No referrals found for this filter."
                filteredEmptyMessage={
                  globalFilter
                    ? `No referrals matching "${globalFilter}".`
                    : "No referrals found for this filter."
                }
                sorting={sorting}
                onSortingChange={setSorting}
                columnFilters={columnFilters}
                onColumnFiltersChange={setColumnFilters}
                globalFilter={globalFilter}
                onGlobalFilterChange={setGlobalFilter}
                onRowClick={(row) => {
                  const code = row.original.referralCode?.trim() ?? "";
                  if (code) {
                    navigate(`/${organizationId}/referrals/facility/${encodeURIComponent(code)}`);
                  }
                }}
                getRowClassName={() => "org-table-row-clickable"}
              />
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

export default FacilityReferralsPage;
