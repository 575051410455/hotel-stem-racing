"use client";

import {
  createColumnHelper,
  rowPaginationFeature,
  tableFeatures,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { attendeeRoleShortLabels } from "@/lib/registrations/fields";
import type { ActivityRow } from "./query";

export const activityFeatures = tableFeatures({ rowPaginationFeature });
const column = createColumnHelper<typeof activityFeatures, ActivityRow>();
const timestamp = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export const activityColumns = column.columns([
  column.display({
    id: "attendee",
    header: "Attendee",
    cell: ({ row }) => `${row.original.givenName} ${row.original.familyName}`,
  }),
  column.accessor("passCode", {
    header: "Pass Code",
    cell: (info) => <span className="font-mono">{info.getValue()}</span>,
  }),
  column.accessor("role", {
    header: "Attendee Role",
    cell: (info) => attendeeRoleShortLabels.en[info.getValue()],
  }),
  column.accessor("organisation", {
    header: "Organisation",
    cell: (info) => info.getValue() || "—",
  }),
  column.accessor("checkedInAt", {
    header: "Checked in (Bangkok)",
    cell: (info) => (
      <time dateTime={info.getValue()}>
        {timestamp.format(new Date(info.getValue()))}
      </time>
    ),
  }),
  column.accessor("accountName", {
    header: "Recorded by",
    cell: (info) => info.getValue() ?? "Unknown Account",
  }),
  column.accessor("outsideRegisteredDay", {
    header: "Registered day",
    cell: (info) =>
      info.getValue() ? (
        <Badge variant="outline">Outside registered day</Badge>
      ) : (
        "Within registered day"
      ),
  }),
]);
