"use client";

import {
  columnFilteringFeature,
  createColumnHelper,
  type FilterFn,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { EventPassEmailCell } from "./event-pass-email";
import { attendeeRoleListLabels, formatCreatedAt, formatEventDay, formatPhone } from "./format";
import type { RegistrationListItem } from "./query";
import { RegistrationDetailLink } from "./registration-detail-link";

/**
 * TanStack Table v9 features for the Registration list. Searching, filtering, sorting and
 * pagination all happen on the server (the table runs in manual mode), so no client-side row
 * models or sort/filter function registries are registered.
 */
export const registrationListFeatures = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
});

type Features = typeof registrationListFeatures;

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
    header: () => <span className="sr-only">รายละเอียด</span>,
    cell: ({ row }) => <RegistrationDetailLink registration={row.original} />,
  }),
  column.accessor("createdAt", {
    header: "ลงทะเบียนเมื่อ",
    cell: (info) => (
      <time dateTime={info.getValue()} className="tabular-nums">
        {formatCreatedAt(info.getValue())}
      </time>
    ),
    sortDescFirst: true,
    enableColumnFilter: false,
  }),
  column.accessor("givenName", { header: "ชื่อ", enableColumnFilter: false }),
  column.accessor("familyName", { header: "นามสกุล", enableColumnFilter: false }),
  column.accessor("role", {
    header: "ฐานะ",
    cell: ({ row }) => {
      const { role, roleOther } = row.original;
      if (role !== "other" || !roleOther) return attendeeRoleListLabels[role];
      return (
        <span className="block max-w-48 truncate" title={roleOther}>
          อื่น ๆ: {roleOther}
        </span>
      );
    },
    enableSorting: false,
    filterFn: filteredOnTheServer,
  }),
  column.accessor("eventDays", {
    header: "วันเข้าร่วมงาน",
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
    header: "โทรศัพท์",
    cell: (info) => <span className="tabular-nums">{formatPhone(info.getValue())}</span>,
    enableSorting: false,
    enableColumnFilter: false,
  }),
  column.accessor("email", { header: "อีเมล", enableSorting: false, enableColumnFilter: false }),
  column.accessor("emailSentCount", {
    header: "อีเมล Event Pass",
    cell: ({ row }) => <EventPassEmailCell registration={row.original} />,
    enableSorting: false,
    enableColumnFilter: false,
  }),
  column.accessor("passCode", {
    header: "รหัส Event Pass",
    cell: (info) => <span className="font-mono">{info.getValue()}</span>,
    enableSorting: false,
    enableColumnFilter: false,
  }),
]);
