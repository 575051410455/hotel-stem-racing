"use client";

import { useQuery } from "@tanstack/react-query";
import {
  type ColumnFiltersState,
  functionalUpdate,
  type Header,
  type PaginationState,
  type ReactTable,
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
import { event } from "@/lib/event";
import { attendeeRoles } from "@/lib/registrations/fields";
import {
  DEFAULT_REGISTRATION_SORT,
  type EventDayDate,
  MAX_QUERY_LENGTH,
  pageSizeOptions,
  registrationSorts,
} from "@/lib/registrations/search-params";
import { cn } from "@/lib/utils";
import { BackOfficeRequestError } from "../query-provider";
import { registrationListColumns, registrationListFeatures } from "./columns";
import { attendeeRoleListLabels } from "./format";
import { type RegistrationListItem, registrationListQuery } from "./query";
import { useRegistrationView } from "./use-registration-view";

const SEARCH_DEBOUNCE_MS = 300;
/** BACK_OFFICE_SIGN_IN_PATH; session.ts is server-only, so it can't be imported here. */
const SIGN_IN_PATH = "/admin/login";
const noRows: RegistrationListItem[] = [];
const formatCount = new Intl.NumberFormat("th-TH").format;
const eventDayDates: readonly string[] = event.eventDays.map((day) => day.date);

const isOneOf = <T extends string>(options: readonly T[], value: unknown): value is T =>
  typeof value === "string" && (options as readonly string[]).includes(value);

/** What the search box sends: trimmed and cut to the length the URL keeps. */
const searchText = (typed: string) => typed.trim().slice(0, MAX_QUERY_LENGTH);

/**
 * The Back Office Registration list: search, Event Day and Attendee Role filters, sortable
 * columns and pagination, all run on the server. The view lives in the URL
 * (useRegistrationView); TanStack Query fetches each page from /api/back-office/registrations
 * and keeps the previous page on screen while the next loads. Render below <Suspense>.
 */
export function RegistrationList() {
  const [view, changeView] = useRegistrationView();
  const { data, error, isPending, isFetching, isPlaceholderData, refetch } = useQuery(
    registrationListQuery(view),
  );

  // ---- Table state, all derived from the URL; every change goes back to the URL ----
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
    };
  }, [view]);

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
  const columnCount = registrationListColumns.length;

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <form
          role="search"
          className="flex min-w-0 flex-1 flex-col gap-2"
          onSubmit={(formEvent) => {
            formEvent.preventDefault();
            submitSearch();
          }}
        >
          <Label htmlFor={ids.search}>ค้นหา</Label>
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
              placeholder="ชื่อ นามสกุล เบอร์โทรศัพท์ อีเมล หรือรหัส Event Pass"
              autoComplete="off"
              enterKeyHint="search"
              className="pl-9"
            />
          </div>
        </form>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor={ids.day}>วันเข้าร่วมงาน</Label>
            <NativeSelect
              id={ids.day}
              value={view.day ?? ""}
              onChange={(changeEvent) =>
                table.getColumn("eventDays")?.setFilterValue(changeEvent.target.value || undefined)
              }
            >
              <NativeSelectOption value="">ทุกวัน</NativeSelectOption>
              {event.eventDays.map(({ date, label }) => (
                <NativeSelectOption key={date} value={date}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={ids.role}>ฐานะการเข้าร่วมงาน</Label>
            <NativeSelect
              id={ids.role}
              value={view.role ?? ""}
              onChange={(changeEvent) =>
                table.getColumn("role")?.setFilterValue(changeEvent.target.value || undefined)
              }
            >
              <NativeSelectOption value="">ทุกฐานะ</NativeSelectOption>
              {attendeeRoles.map((role) => (
                <NativeSelectOption key={role} value={role}>
                  {attendeeRoleListLabels[role]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          {filtered && (
            <Button type="button" variant="ghost" onClick={clearFilters}>
              ล้างตัวกรอง
            </Button>
          )}
        </div>
      </div>

      <p role="status" className="min-h-5 text-sm leading-normal text-muted-foreground">
        {data
          ? `${filtered ? "พบ" : "ทั้งหมด"} ${formatCount(data.total)} รายการ`
          : isPending
            ? "กำลังโหลดรายการลงทะเบียน…"
            : null}
        {data && isFetching && isPlaceholderData ? " · กำลังโหลด…" : null}
      </p>

      <div
        aria-busy={isFetching}
        className={cn(
          "rounded-md border bg-background transition-opacity",
          isPlaceholderData && "opacity-60",
        )}
      >
        <Table>
          <TableHeader>
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
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columnCount} className="h-32 text-center whitespace-normal">
                  {error && !data ? (
                    <LoadFailed error={error} onRetry={() => refetch()} />
                  ) : !data ? (
                    <span className="text-muted-foreground">กำลังโหลด…</span>
                  ) : data.total > 0 ? (
                    <EmptyState
                      message="ไม่มีรายการในหน้านี้"
                      action={{ label: "กลับไปหน้าแรก", onClick: () => table.firstPage() }}
                    />
                  ) : filtered ? (
                    <EmptyState
                      message="ไม่พบการลงทะเบียนที่ตรงกับการค้นหา"
                      action={{ label: "ล้างตัวกรอง", onClick: clearFilters }}
                    />
                  ) : (
                    <EmptyState message="ยังไม่มีการลงทะเบียน" />
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

type ListTable = ReactTable<typeof registrationListFeatures, RegistrationListItem>;

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
        className="-ml-3"
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
        <p className="leading-normal">หมดเวลาการเข้าสู่ระบบ</p>
        <Button asChild variant="outline" size="sm">
          <Link href={SIGN_IN_PATH}>เข้าสู่ระบบอีกครั้ง</Link>
        </Button>
      </div>
    );
  }
  return (
    <div role="alert" className="flex flex-col items-center gap-3">
      <p className="leading-normal">โหลดรายการลงทะเบียนไม่สำเร็จ</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        ลองอีกครั้ง
      </Button>
    </div>
  );
}

function Pagination({
  table,
  total,
  shownRows,
  page,
  pageSize,
}: {
  table: ListTable;
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

  return (
    <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="leading-normal text-muted-foreground">
        {shownRows > 0
          ? `แสดง ${formatCount(from)}–${formatCount(to)} จาก ${formatCount(total)} รายการ`
          : null}
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={pageSizeId} className="font-normal">
            แถวต่อหน้า
          </Label>
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
        <p className="leading-normal tabular-nums">
          หน้า {formatCount(page)} จาก {formatCount(pageCount)}
        </p>
        <nav aria-label="เลือกหน้า" className="flex items-center gap-1">
          <PageButton
            label="หน้าแรก"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.firstPage()}
          >
            <ChevronsLeftIcon />
          </PageButton>
          <PageButton
            label="หน้าก่อนหน้า"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeftIcon />
          </PageButton>
          <PageButton
            label="หน้าถัดไป"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            <ChevronRightIcon />
          </PageButton>
          <PageButton
            label="หน้าสุดท้าย"
            disabled={!table.getCanLastPage() || !table.getCanNextPage()}
            onClick={() => table.lastPage()}
          >
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
