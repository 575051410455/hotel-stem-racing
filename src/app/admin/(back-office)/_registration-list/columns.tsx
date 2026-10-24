"use client";

import {
  type Column,
  columnFilteringFeature,
  columnVisibilityFeature,
  createColumnHelper,
  type FilterFn,
  globalFilteringFeature,
  type ReactTable,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { attendeeRoleShortLabels } from "@/lib/registrations/fields";
import { EventPassEmailCell } from "./event-pass-email";
import { formatCreatedAt, formatEventDay, formatPhone } from "./format";
import type { RegistrationListItem } from "./query";
import { RegistrationDetailLink } from "./registration-detail-link";

/**
 * TanStack Table v9 features for the Registration list. Searching, filtering, sorting and
 * pagination all happen on the server (the table runs in manual mode), so no client-side row
 * models or sort/filter function registries are registered. Column visibility is the only
 * state that stays in the browser: the "Columns" menu hides columns on screen, never in the
 * data or the CSV export.
 */
export const registrationListFeatures = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  globalFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
});

type Features = typeof registrationListFeatures;

export type RegistrationListTable = ReactTable<Features, RegistrationListItem>;

/** The database does the filtering; the table only holds each filter's value. */
const filteredOnTheServer: FilterFn<Features, RegistrationListItem> = () => true;

const column = createColumnHelper<Features, RegistrationListItem>();

/**
 * The list's columns, in order. A column's `id` (its accessor key) is what sorting and column
 * filters refer to: sortable ids must be RegistrationSortColumns; "role" and "eventDays" carry
 * the Attendee Role and Event Day filters. Add a row action as a `column.display({ id, cell })`.
 */
export const registrationListColumns = column.columns([
  // First, so it stays in view when the wide table scrolls sideways.
  column.display({
    id: "detail",
    header: () => <span className="sr-only">Details</span>,
    cell: ({ row }) => <RegistrationDetailLink registration={row.original} />,
    // The way into a Registration; hiding it would leave rows Staff can't open.
    enableHiding: false,
  }),
  column.accessor("createdAt", {
    header: "Registered",
    cell: (info) => (
      <time dateTime={info.getValue()} className="tabular-nums">
        {formatCreatedAt(info.getValue())}
      </time>
    ),
    sortDescFirst: true,
    enableColumnFilter: false,
  }),
  column.accessor("givenName", { header: "Given name", enableColumnFilter: false }),
  column.accessor("familyName", { header: "Family name", enableColumnFilter: false }),
  column.accessor("role", {
    header: "Attendee Role",
    cell: ({ row }) => {
      const { role, roleOther } = row.original;
      if (role !== "other" || !roleOther) return attendeeRoleShortLabels.en[role];
      return (
        <span className="block max-w-48 truncate" title={roleOther}>
          {attendeeRoleShortLabels.en.other}: {roleOther}
        </span>
      );
    },
    enableSorting: false,
    filterFn: filteredOnTheServer,
  }),
  column.accessor("eventDays", {
    header: "Event Days",
    cell: (info) => (
      <span className="flex gap-1">
        {info.getValue().map((day) => (
          <Badge key={day} variant="outline">
            {formatEventDay(day)}
          </Badge>
        ))}
      </span>
    ),
    enableSorting: false,
    filterFn: filteredOnTheServer,
  }),
  column.accessor("phone", {
    header: "Phone",
    cell: (info) => <span className="tabular-nums">{formatPhone(info.getValue())}</span>,
    enableSorting: false,
    enableColumnFilter: false,
  }),
  column.accessor("email", { header: "Email", enableSorting: false, enableColumnFilter: false }),
  column.accessor("emailSentCount", {
    header: "Event Pass email",
    cell: ({ row }) => <EventPassEmailCell registration={row.original} />,
    enableSorting: false,
    enableColumnFilter: false,
  }),
  column.accessor("passCode", {
    header: "Pass Code",
    cell: (info) => <span className="font-mono">{info.getValue()}</span>,
    enableSorting: false,
    enableColumnFilter: false,
  }),
]);

/** What the "Columns" menu calls a column: its header text. */
export function columnLabel(column: Column<Features, RegistrationListItem, unknown>): string {
  const { header } = column.columnDef;
  return typeof header === "string" ? header : column.id;
}
