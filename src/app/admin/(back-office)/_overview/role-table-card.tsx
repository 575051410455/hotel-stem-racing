import { type ReactNode, Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/session";
import { event } from "@/lib/event";
import { type AttendeeRole, attendeeRoleShortLabels, attendeeRoles } from "@/lib/registrations/fields";
import { cn } from "@/lib/utils";
import { readHeadCounts } from "./head-counts";

const formatCount = new Intl.NumberFormat("en-GB").format;

/**
 * Registrations per Event Day by Attendee Role, for planning each day's crowd. The card and its
 * title are part of the static shell; the table is Admin-only and streams in behind its own
 * boundary.
 */
export function RoleTableCard({ className }: { className?: string }) {
  return (
    <Card className={cn("@container/card gap-4", className)}>
      <CardHeader>
        <CardTitle>
          <h3 id="role-table-heading" className="leading-normal">
            Registrations by Attendee Role
          </h3>
        </CardTitle>
        <CardDescription id="role-table-note" className="leading-normal">
          People who chose both days count on each day
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<RoleTableSkeleton />}>
          <RoleTableWithCounts />
        </Suspense>
      </CardContent>
    </Card>
  );
}

async function RoleTableWithCounts() {
  await requireAdmin();
  const counts = await readHeadCounts();

  return (
    <RoleTable
      cell={(eventDay, role) => {
        const day = counts.eventDays.find((counted) => counted.eventDay === eventDay);
        const count = !day ? 0 : role === "total" ? day.total : day.byRole[role];
        return formatCount(count);
      }}
    />
  );
}

/** The same table with placeholders, so the card keeps its size while the numbers load. */
function RoleTableSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Loading Registration counts…</span>
      <RoleTable cell={() => <Skeleton aria-hidden="true" className="ml-auto h-5 w-8" />} />
    </div>
  );
}

/**
 * Attendee Roles as rows ("Other", not the form's "Other (please specify)"), then each Event Day's
 * total; Event Days as columns. `cell` gives the content for one Event Day and Attendee Role, or
 * that day's total.
 */
function RoleTable({ cell }: { cell: (eventDay: string, role: AttendeeRole | "total") => ReactNode }) {
  return (
    <Table aria-labelledby="role-table-heading" aria-describedby="role-table-note">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead scope="col" className="h-auto py-2 leading-normal whitespace-normal">
            Attendee Role
          </TableHead>
          {event.eventDays.map(({ date, label }) => (
            <TableHead key={date} scope="col" className="h-auto py-2 text-right leading-normal whitespace-normal">
              {label.en}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {attendeeRoles.map((role) => (
          <TableRow key={role}>
            <TableHead scope="row" className="h-auto py-2 leading-normal font-normal whitespace-normal">
              {attendeeRoleShortLabels.en[role]}
            </TableHead>
            {event.eventDays.map(({ date }) => (
              <TableCell key={date} className="text-right tabular-nums">
                {cell(date, role)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
      <TableFooter className="bg-transparent">
        <TableRow className="hover:bg-transparent">
          <TableHead scope="row" className="h-auto py-2 leading-normal">
            Total
          </TableHead>
          {event.eventDays.map(({ date }) => (
            <TableCell key={date} className="text-right tabular-nums">
              {cell(date, "total")}
            </TableCell>
          ))}
        </TableRow>
      </TableFooter>
    </Table>
  );
}
