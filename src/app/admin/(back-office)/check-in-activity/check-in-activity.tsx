"use client";

import { useQuery } from "@tanstack/react-query";
import { functionalUpdate, useTable } from "@tanstack/react-table";
import Link from "next/link";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
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
import {
  activityPageSizes,
  ACTIVITY_QUERY_LIMIT,
  type ActivityView,
} from "@/lib/registrations/check-in-activity-view";
import {
  attendeeRoleShortLabels,
  attendeeRoles,
} from "@/lib/registrations/fields";
import { BackOfficeRequestError } from "../query-provider";
import { activityColumns, activityFeatures } from "./columns";
import { activityQuery, type ActivityRow } from "./query";
import { useActivityView } from "./use-activity-view";

const noRows: ActivityRow[] = [];
const count = new Intl.NumberFormat("en-GB").format;
const summaryLabels = {
  registered: "Registered for this day",
  checkedInRegistered: "Registered and checked in",
  awaiting: "Awaiting Check-In",
  outside: "Outside registered day",
  total: "Total Check-Ins",
} as const;

export function CheckInActivity({
  defaultDay,
}: {
  defaultDay: ActivityView["day"];
}) {
  const [view, changeView] = useActivityView(defaultDay);
  const result = useQuery(activityQuery(view));
  const id = useId();
  const unauthorized =
    result.error instanceof BackOfficeRequestError &&
    result.error.status === 401;
  const data = unauthorized ? undefined : result.data;
  const pagination = { pageIndex: view.page - 1, pageSize: view.pageSize };
  const table = useTable({
    features: activityFeatures,
    columns: activityColumns,
    data: data?.rows ?? noRows,
    getRowId: (row) => String(row.id),
    manualPagination: true,
    rowCount: data?.total ?? 0,
    state: { pagination },
    onPaginationChange: (updater) => {
      const next = functionalUpdate(updater, pagination);
      changeView(
        next.pageSize === view.pageSize
          ? { page: next.pageIndex + 1 }
          : {
              pageSize:
                activityPageSizes.find((size) => size === next.pageSize) ?? 25,
            },
      );
    },
  });
  const filtered = Boolean(
    view.q || view.role || view.account || view.outside !== undefined,
  );
  const clearFilters = () =>
    changeView({
      q: undefined,
      role: undefined,
      account: undefined,
      outside: undefined,
    });
  const pages = Math.max(1, table.getPageCount());

  if (unauthorized)
    return (
      <div role="alert" className="space-y-3">
        <p>Your session ended or this Account no longer has access.</p>
        <Button asChild variant="outline">
          <Link href={SIGN_IN_PATH}>Sign in again</Link>
        </Button>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${id}-day`}>Event Day</Label>
          <NativeSelect
            id={`${id}-day`}
            value={view.day}
            onChange={(e) => {
              const day = event.eventDays.find(
                (day) => day.date === e.target.value,
              );
              if (day) changeView({ day: day.date });
            }}
          >
            {event.eventDays.map((day) => (
              <NativeSelectOption key={day.date} value={day.date}>
                {day.label.en}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Updates every 15 seconds while visible
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={result.isFetching}
            onClick={() => {
              void result.refetch();
            }}
          >
            {result.isFetching ? "Updating…" : "Refresh"}
          </Button>
        </div>
      </div>

      <section aria-labelledby={`${id}-overview`} className="space-y-3">
        <h2 id={`${id}-overview`} className="text-lg font-semibold">
          Event Day overview
        </h2>
        <p className="text-sm text-muted-foreground">
          Counts cover the entire selected Event Day. Table search and filters
          do not change these totals.
        </p>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Object.entries(summaryLabels).map(([key, label]) => (
            <div key={key} className="rounded-xl border bg-card p-4">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="mt-2 text-3xl font-semibold tabular-nums">
                {data
                  ? count(data.summary[key as keyof typeof summaryLabels])
                  : "—"}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby={`${id}-history`} className="space-y-4">
        <h2 id={`${id}-history`} className="text-lg font-semibold">
          Recorded Check-Ins
        </h2>
        <p className="text-sm text-muted-foreground">
          Successful first Check-In per Attendee and Event Day, newest first.
          Repeat scans and failed attempts are not recorded. Deleting a
          Registration removes its Check-Ins.
        </p>
        <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <form
            key={view.q ?? ""}
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              const q = String(new FormData(e.currentTarget).get("q") ?? "")
                .trim()
                .slice(0, ACTIVITY_QUERY_LIMIT);
              changeView({ q: q || undefined });
            }}
          >
            <Label htmlFor={`${id}-search`}>Search Check-Ins</Label>
            <div className="flex gap-2">
              <Input
                id={`${id}-search`}
                name="q"
                type="search"
                defaultValue={view.q ?? ""}
                maxLength={ACTIVITY_QUERY_LIMIT}
                placeholder="Name, Pass Code or organisation"
                autoComplete="off"
              />
              <Button type="submit" variant="outline">
                Search
              </Button>
            </div>
          </form>
          <div className="space-y-2">
            <Label htmlFor={`${id}-role`}>Attendee Role</Label>
            <NativeSelect
              id={`${id}-role`}
              value={view.role ?? ""}
              onChange={(e) =>
                changeView({
                  role: attendeeRoles.find((role) => role === e.target.value),
                })
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
          <div className="space-y-2">
            <Label htmlFor={`${id}-account`}>Recorded by</Label>
            <NativeSelect
              id={`${id}-account`}
              value={view.account ?? ""}
              onChange={(e) =>
                changeView({ account: e.target.value || undefined })
              }
            >
              <NativeSelectOption value="">All Accounts</NativeSelectOption>
              {view.account &&
              !data?.accounts.some((account) => account.id === view.account) ? (
                <NativeSelectOption value={view.account}>
                  Selected Account (unavailable)
                </NativeSelectOption>
              ) : null}
              {data?.accounts.map((account) => (
                <NativeSelectOption key={account.id} value={account.id}>
                  {account.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-outside`}>Registered day</Label>
            <NativeSelect
              id={`${id}-outside`}
              value={view.outside === undefined ? "" : String(view.outside)}
              onChange={(e) =>
                changeView({
                  outside:
                    e.target.value === ""
                      ? undefined
                      : e.target.value === "true",
                })
              }
            >
              <NativeSelectOption value="">All Check-Ins</NativeSelectOption>
              <NativeSelectOption value="false">
                Within registered day
              </NativeSelectOption>
              <NativeSelectOption value="true">
                Outside registered day
              </NativeSelectOption>
            </NativeSelect>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p role="status" className="text-sm text-muted-foreground">
            {data
              ? `${count(data.total)} ${filtered ? "matching" : "recorded"} Check-Ins`
              : result.isPending
                ? "Loading Check-Ins…"
                : "Check-Ins unavailable"}
            {data && result.isFetching ? " · Updating…" : null}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!filtered}
            onClick={clearFilters}
          >
            Clear filters
          </Button>
        </div>
        {result.error ? (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm"
          >
            <p>
              {data
                ? "Update failed. Showing previously loaded data."
                : "Could not load Check-In Activity."}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={result.isFetching}
              onClick={() => {
                void result.refetch();
              }}
            >
              Try again
            </Button>
          </div>
        ) : null}
        <div
          aria-busy={result.isFetching}
          className="min-w-0 overflow-hidden rounded-lg border"
        >
          <Table>
            <TableHeader className="bg-muted">
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id}>
                  {group.headers.map((header) => (
                    <TableHead key={header.id}>
                      <table.FlexRender header={header} />
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={activityColumns.length}
                    className="h-32 text-center whitespace-normal"
                  >
                    {!data ? (
                      result.isPending ? (
                        "Loading Check-Ins…"
                      ) : (
                        "Check-Ins unavailable"
                      )
                    ) : data.total > 0 ? (
                      <div className="space-y-3">
                        <p>No Check-Ins on this page.</p>
                        <Button
                          variant="outline"
                          onClick={() => changeView({ page: 1 })}
                        >
                          Back to the first page
                        </Button>
                      </div>
                    ) : filtered ? (
                      "No Check-Ins match your search or filters."
                    ) : (
                      "No Check-Ins recorded for this Event Day."
                    )}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Label htmlFor={`${id}-size`}>Rows per page</Label>
            <NativeSelect
              id={`${id}-size`}
              value={view.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
            >
              {activityPageSizes.map((size) => (
                <NativeSelectOption key={size} value={size}>
                  {size}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <p className="tabular-nums">
            Page {count(view.page)} of {count(pages)}
          </p>
          <nav aria-label="Check-In pages" className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!data || view.page <= 1}
              onClick={() => table.firstPage()}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!data || !table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!data || !table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!data || view.page >= pages}
              onClick={() => table.lastPage()}
            >
              Last
            </Button>
          </nav>
        </div>
      </section>
    </div>
  );
}
