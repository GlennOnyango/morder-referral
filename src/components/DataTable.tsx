import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type OnChangeFn,
  type Row,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useEffect } from "react";
import { Button } from "./ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { cn } from "../lib/utils";

export const DATA_TABLE_MAX_VISIBLE_ROWS = 10;

type DataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  emptyMessage: string;
  filteredEmptyMessage?: string;
  resultLabel?: string;
  maxVisibleRows?: number;
  estimatedRowHeight?: number;
  className?: string;
  tableClassName?: string;
  bodyClassName?: string;
  stickyHeader?: boolean;
  sortableHeaders?: boolean;
  showPagination?: boolean;
  showSummary?: boolean;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
  globalFilter?: string;
  onGlobalFilterChange?: OnChangeFn<string>;
  onRowClick?: (row: Row<TData>) => void;
  getRowClassName?: (row: Row<TData>) => string | undefined;
  rowButtonSelector?: string;
};

function DataTable<TData>({
  data,
  columns,
  emptyMessage,
  filteredEmptyMessage,
  resultLabel = "item",
  maxVisibleRows = DATA_TABLE_MAX_VISIBLE_ROWS,
  estimatedRowHeight = 56,
  className,
  tableClassName,
  bodyClassName,
  stickyHeader = true,
  sortableHeaders = false,
  showPagination = true,
  showSummary = true,
  sorting,
  onSortingChange,
  columnFilters,
  onColumnFiltersChange,
  globalFilter,
  onGlobalFilterChange,
  onRowClick,
  getRowClassName,
  rowButtonSelector = "button, a, input, select, textarea, [role='button'], [data-stop-row-click]",
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    state: {
      ...(sorting !== undefined ? { sorting } : {}),
      ...(columnFilters !== undefined ? { columnFilters } : {}),
      ...(globalFilter !== undefined ? { globalFilter } : {}),
    },
    onSortingChange,
    onColumnFiltersChange,
    onGlobalFilterChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: maxVisibleRows } },
  });

  const totalRows = table.getFilteredRowModel().rows.length;
  const currentPage = table.getState().pagination.pageIndex + 1;
  const pageCount = Math.max(1, table.getPageCount());
  const hasFilters =
    table.getState().globalFilter !== undefined && String(table.getState().globalFilter).trim().length > 0
      ? true
      : table.getState().columnFilters.length > 0;
  const maxHeight = estimatedRowHeight * maxVisibleRows + 52;

  useEffect(() => {
    if (table.getState().pagination.pageSize !== maxVisibleRows) {
      table.setPageSize(maxVisibleRows);
    }
  }, [maxVisibleRows, table]);

  const emptyStateMessage = hasFilters && filteredEmptyMessage ? filteredEmptyMessage : emptyMessage;

  return (
    <div className={cn("grid gap-3", className)}>
      <div
        className="overflow-auto rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm"
        style={{ maxHeight }}
      >
        <Table className={cn("org-table min-w-[760px]", tableClassName)}>
          <TableHeader className={cn(stickyHeader && "sticky top-0 z-10 bg-slate-50/95 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80")}>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    onClick={sortableHeaders ? header.column.getToggleSortingHandler() : undefined}
                    className={cn(
                      "whitespace-nowrap border-b border-slate-200 bg-transparent",
                      stickyHeader && "sticky top-0 bg-slate-50/95",
                      sortableHeaders &&
                        header.column.getCanSort() &&
                        "cursor-pointer select-none transition-colors hover:text-slate-900",
                    )}
                  >
                    {header.isPlaceholder ? null : (
                      <div className="flex items-center gap-1.5">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sortableHeaders && header.column.getCanSort() ? (
                          header.column.getIsSorted() === "asc" ? (
                            <span className="text-xs text-slate-500">↑</span>
                          ) : header.column.getIsSorted() === "desc" ? (
                            <span className="text-xs text-slate-500">↓</span>
                          ) : (
                            <ArrowUpDown className="size-3.5 text-slate-400" />
                          )
                        ) : null}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody className={bodyClassName}>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => {
                const clickable = typeof onRowClick === "function";
                return (
                  <TableRow
                    key={row.id}
                    tabIndex={clickable ? 0 : undefined}
                    className={cn(
                      clickable &&
                        "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-inset",
                      clickable && "hover:bg-sky-50/60",
                      getRowClassName?.(row),
                    )}
                    onClick={() => onRowClick?.(row)}
                    onKeyDown={(event) => {
                      if (!clickable) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onRowClick(row);
                      }
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="align-middle"
                        onClick={(event) => {
                          if ((event.target as HTMLElement).closest(rowButtonSelector)) {
                            event.stopPropagation();
                          }
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={Math.max(1, table.getVisibleLeafColumns().length)}
                  className="py-12 text-center"
                >
                  <div className="mx-auto max-w-md">
                    <p className="org-empty text-sm text-slate-500">{emptyStateMessage}</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {(showSummary || showPagination) && (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200/70 bg-slate-50/70 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          {showSummary ? (
            <p className="m-0 text-xs text-slate-600">
              Page {currentPage} of {pageCount} · {totalRows} {resultLabel}
              {totalRows !== 1 ? "s" : ""}
            </p>
          ) : (
            <span />
          )}

          {showPagination && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2.5"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                aria-label="Go to first page"
              >
                <ChevronsLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2.5"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="Go to previous page"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2.5"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label="Go to next page"
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2.5"
                onClick={() => table.setPageIndex(pageCount - 1)}
                disabled={!table.getCanNextPage()}
                aria-label="Go to last page"
              >
                <ChevronsRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DataTable;
