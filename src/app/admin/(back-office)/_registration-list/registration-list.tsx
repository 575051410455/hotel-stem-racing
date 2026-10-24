"use client";

import { useQuery } from "@tanstack/react-query";
import {
  type ColumnFiltersState,
  type ColumnVisibilityState,
  functionalUpdate,
  type Header,
  type PaginationState,
  type SortingState,
  useTable,
} from "@tanstack/react-table";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  SearchIcon,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SIGN_IN_PATH } from "@/lib/auth/access";
import { event } from "@/lib/event";
import { attendeeRoleShortLabels, attendeeRoles } from "@/lib/registrations/fields";
import {
  DEFAULT_REGISTRATION_SORT,
  type EventDayDate,
  MAX_QUERY_LENGTH,
  pageSizeOptions,
  registrationSorts,
} from "@/lib/registrations/search-params";
import { cn } from "@/lib/utils";
import { BackOfficeRequestError } from "../query-provider";
import { ColumnMenu } from "./column-menu";
import {
  type RegistrationListTable,
  registrationListColumns,
  registrationListFeatures,
} from "./columns";
import { ExportCsvLink } from "./export-csv-link";
import { formatEventDay } from "./format";
import { type RegistrationListItem, registrationListQuery } from "./query";
import { useRegistrationView } from "./use-registration-view";

const SEARCH_DEBOUNCE_MS = 300;
const noRows: RegistrationListItem[] = [];
const formatCount = new Intl.NumberFormat("en-GB").format;
const eventDayDates: readonly string[] = event.eventDays.map((day) => day.date);

const isOneOf = <T extends string>(options: readonly T[], value: unknown): value is T =>
  typeof value === "string" && (options as readonly string[]).includes(value);

/** What the search box sends: trimmed and cut to the length the URL keeps. */
const searchText = (typed: string) => typed.trim().slice(0, MAX_QUERY_LENGTH);

/**
 * The Back Office Registration list: a toolbar (search, Event Day and Attendee Role filters, the
 * "Columns" menu, CSV export), sortable columns and pagination. Search, filters, sort and paging
 * run on the server: the view lives in the URL (useRegistrationView), and TanStack Query fetches
 * each page from /api/back-office/registrations, keeping the previous page on screen while the
 * next loads. Hidden columns belong to this screen only: not in the URL, all shown again on
 * reload, and never left out of the CSV export. Render below <Suspense>.
 */
export function RegistrationList() {
  const [view, changeView] = useRegistrationView();
  const { data, error, isPending, isFetching, isPlaceholderData, refetch } = useQuery(
    registrationListQuery(view),
  );
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});

  // ---- Table state: the view comes from the URL, and every change to it goes back there ----
  const tableState = useMemo(() => {
    const [column, direction] = view.sort.split(".");
    return {
      sorting: [{ id: column, desc: direction === "desc" }] satisfies SortingState,
      pagination: { pageIndex: view.page - 1, pageSize: view.pageSize } satisfies PaginationState,
      globalFilter: view.q ?? "",
      columnFilters: [
        ...(view.role ? [{ id: "role", value: view.role }] : []),
        ...(view.day ? [{ id: "eventDays", value: view.day }] : []),
      ] satisfies ColumnFiltersState,
      columnVisibility,
    };
  }, [view, columnVisibility]);

  const table = useTable({
    features: registrationListFeatures,
    columns: registrationListColumns,
    data: data?.rows ?? noRows,
    getRowId: (row) => String(row.id),
    manualFiltering: true,
    manualSorting: true,
    manualPagination: true,
    rowCount: data?.total ?? 0,
    enableMultiSort: false,
    enableSortingRemoval: false,
    state: tableState,
    onSortingChange: (updater) => {
      const [first] = functionalUpdate(updater, tableState.sorting);
      const sort = first ? `${first.id}.${first.desc ? "desc" : "asc"}` : DEFAULT_REGISTRATION_SORT;
      if (isOneOf(registrationSorts, sort)) changeView({ sort });
    },
    onPaginationChange: (updater) => {
      const next = functionalUpdate(updater, tableState.pagination);
      if (next.pageSize !== view.pageSize) changeView({ pageSize: next.pageSize });
      else changeView({ page: next.pageIndex + 1 });
    },
    onGlobalFilterChange: (updater) => {
      const q = searchText(String(functionalUpdate(updater, tableState.globalFilter) ?? ""));
      changeView({ q: q || undefined });
    },
    onColumnFiltersChange: (updater) => {
      const next = functionalUpdate(updater, tableState.columnFilters);
      const valueOf = (id: string) => next.find((filter) => filter.id === id)?.value;
      const role = valueOf("role");
      const day = valueOf("eventDays");
      changeView({
        role: isOneOf(attendeeRoles, role) ? role : undefined,
        day: isOneOf(eventDayDates, day) ? (day as EventDayDate) : undefined,
      });
    },
    onColumnVisibilityChange: setColumnVisibility,
  });

  // ---- Search box: sent to the URL after a pause in typing, or at once on Enter ----
  const [draft, setDraft] = useState(view.q ?? "");
  // Back/forward, a shared link or "clear" changed the search: show it in the box.
  const [shownQuery, setShownQuery] = useState(view.q);
  if (shownQuery !== view.q) {
    setShownQuery(view.q);
    if (searchText(draft) !== (view.q ?? "")) setDraft(view.q ?? "");
  }
  const searchTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(searchTimer.current), []);

  function typeSearch(typed: string) {
    setDraft(typed);
    window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(
      () => table.setGlobalFilter(searchText(typed)),
      SEARCH_DEBOUNCE_MS,
    );
  }

  function submitSearch() {
    window.clearTimeout(searchTimer.current);
    table.setGlobalFilter(searchText(draft));
  }

  const filtered = Boolean(view.q || view.day || view.role);
  function clearFilters() {
    window.clearTimeout(searchTimer.current);
    changeView({ q: undefined, day: undefined, role: undefined });
  }

  const ids = { search: useId(), day: useId(), role: useId() };
  const rows = table.getRowModel().rows;
  const visibleColumnCount = table.getVisibleLeafColumns().length;

  return (
    <div className="mt-4 flex flex-col gap-4">
      {/*
        The toolbar, in dashboard-01's compact size (h-8): one row at 1280 with the sidebar open,
        even with "Clear filters" showing; on a narrow screen it wraps, search first.
      */}
      <div className="flex flex-wrap items-end gap-x-2 gap-y-3">
        <form
          role="search"
          className="flex min-w-0 flex-[1_1_12rem] flex-col gap-2"
          onSubmit={(formEvent) => {
            formEvent.preventDefault();
            submitSearch();
          }}
        >
          <Label htmlFor={ids.search}>Search</Label>
          <div className="relative">
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id={ids.search}
              type="search"
              value={draft}
              onChange={(changeEvent) => typeSearch(changeEvent.target.value)}
              maxLength={MAX_QUERY_LENGTH}
              placeholder="Name, phone, email or Pass Code"
              autoComplete="off"
              enterKeyHint="search"
              className="h-8 pl-9"
            />
          </div>
        </form>

        <div className="flex flex-col gap-2">
          <Label htmlFor={ids.day}>Event Day</Label>
          <NativeSelect
            id={ids.day}
            size="sm"
            value={view.day ?? ""}
            onChange={(changeEvent) =>
              table.getColumn("eventDays")?.setFilterValue(changeEvent.target.value || undefined)
            }
          >
            <NativeSelectOption value="">All days</NativeSelectOption>
            {event.eventDays.map(({ date }) => (
              <NativeSelectOption key={date} value={date}>
                {formatEventDay(date)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={ids.role}>Attendee Role</Label>
          <NativeSelect
            id={ids.role}
            size="sm"
            value={view.role ?? ""}
            onChange={(changeEvent) =>
              table.getColumn("role")?.setFilterValue(changeEvent.target.value || undefined)
            }
          >
            <NativeSelectOption value="">All roles</NativeSelectOption>
            {attendeeRoles.map((role) => (
              <NativeSelectOption key={role} value={role}>
                {attendeeRoleShortLabels.en[role]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        {filtered && (
          <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <ColumnMenu table={table} columnVisibility={columnVisibility} />
          <ExportCsvLink view={view} />
        </div>
      </div>

      <p role="status" className="min-h-5 text-sm leading-normal text-muted-foreground">
        {data
          ? `${formatCount(data.total)} ${filtered ? "found" : "in total"}`
          : isPending
            ? "Loading Registrations…"
            : null}
        {data && isFetching && isPlaceholderData ? " · Loading…" : null}
      </p>

      <div
        aria-busy={isFetching}
        className={cn(
          "overflow-hidden rounded-lg border bg-background transition-opacity",
          isPlaceholderData && "opacity-60",
        )}
      >
        <Table>
          <TableHeader className="bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <SortableHead key={header.id} header={header}>
                    <table.FlexRender header={header} />
                  </SortableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={visibleColumnCount}
                  className="h-32 text-center whitespace-normal"
                >
                  {error && !data ? (
                    <LoadFailed error={error} onRetry={() => refetch()} />
                  ) : !data ? (
                    <span className="text-muted-foreground">Loading…</span>
                  ) : data.total > 0 ? (
                    <EmptyState
                      message="No Registrations on this page"
                      action={{ label: "Back to the first page", onClick: () => table.firstPage() }}
                    />
                  ) : filtered ? (
                    <EmptyState
                      message="No Registrations match your search"
                      action={{ label: "Clear filters", onClick: clearFilters }}
                    />
                  ) : (
                    <EmptyState message="No Registrations yet" />
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        table={table}
        total={data?.total ?? 0}
        shownRows={rows.length}
        page={view.page}
        pageSize={view.pageSize}
      />
    </div>
  );
}

/** A column header; sortable columns get a button that flips the order, and `aria-sort`. */
function SortableHead({
  header,
  children,
}: {
  header: Header<typeof registrationListFeatures, RegistrationListItem, unknown>;
  children: ReactNode;
}) {
  if (!header.column.getCanSort()) return <TableHead>{children}</TableHead>;

  const sorted = header.column.getIsSorted();
  const Icon = sorted === "asc" ? ArrowUpIcon : sorted === "desc" ? ArrowDownIcon : ArrowUpDownIcon;
  return (
    <TableHead
      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        // The header row is bg-muted, the same grey as a ghost button's hover, so hover lightens.
        className="-ml-3 hover:bg-background"
        onClick={header.column.getToggleSortingHandler()}
      >
        {children}
        <Icon aria-hidden="true" className={cn(!sorted && "text-muted-foreground")} />
      </Button>
    </TableHead>
  );
}

function EmptyState({
  message,
  action,
}: {
  message: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="leading-normal text-muted-foreground">{message}</p>
      {action && (
        <Button type="button" variant="outline" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

function LoadFailed({ error, onRetry }: { error: Error; onRetry: () => void }) {
  if (error instanceof BackOfficeRequestError && error.status === 401) {
    return (
      <div className="flex flex-col items-center gap-3">
        <p className="leading-normal">Session expired</p>
        <Button asChild variant="outline" size="sm">
          <Link href={SIGN_IN_PATH}>Sign in again</Link>
        </Button>
      </div>
    );
  }
  return (
    <div role="alert" className="flex flex-col items-center gap-3">
      <p className="leading-normal">{"Couldn't load Registrations"}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

/**
 * Below the table: the rows on show, rows per page, "Page X of Y", and buttons for the first,
 * previous, next and last page, disabled at the ends. Every change goes to the URL via the table.
 */
function Pagination({
  table,
  total,
  shownRows,
  page,
  pageSize,
}: {
  table: RegistrationListTable;
  total: number;
  shownRows: number;
  page: number;
  pageSize: number;
}) {
  const pageSizeId = useId();
  const pageCount = Math.max(1, table.getPageCount());
  const from = shownRows > 0 ? (page - 1) * pageSize + 1 : 0;
  const to = shownRows > 0 ? from + shownRows - 1 : 0;
  // A size typed into the URL (and clamped) still shows in the menu.
  const sizes = [...new Set<number>([...pageSizeOptions, pageSize])].sort((a, b) => a - b);
  const onFirstPage = !table.getCanPreviousPage();
  const onLastPage = !table.getCanLastPage() || !table.getCanNextPage();

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 text-sm">
      <p className="leading-normal text-muted-foreground tabular-nums">
        {shownRows > 0
          ? `Showing ${formatCount(from)}–${formatCount(to)} of ${formatCount(total)}`
          : null}
      </p>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex items-center gap-2">
          <Label htmlFor={pageSizeId}>Rows per page</Label>
          <NativeSelect
            id={pageSizeId}
            size="sm"
            value={pageSize}
            onChange={(changeEvent) => table.setPageSize(Number(changeEvent.target.value))}
          >
            {sizes.map((size) => (
              <NativeSelectOption key={size} value={size}>
                {size}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <p className="leading-normal font-medium tabular-nums">
          Page {formatCount(page)} of {formatCount(pageCount)}
        </p>
        <nav aria-label="Pages" className="flex items-center gap-2">
          <PageButton label="First page" disabled={onFirstPage} onClick={() => table.firstPage()}>
            <ChevronsLeftIcon />
          </PageButton>
          <PageButton label="Previous page" disabled={onFirstPage} onClick={() => table.previousPage()}>
            <ChevronLeftIcon />
          </PageButton>
          <PageButton label="Next page" disabled={onLastPage} onClick={() => table.nextPage()}>
            <ChevronRightIcon />
          </PageButton>
          <PageButton label="Last page" disabled={onLastPage} onClick={() => table.lastPage()}>
            <ChevronsRightIcon />
          </PageButton>
        </nav>
      </div>
    </div>
  );
}

function PageButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
