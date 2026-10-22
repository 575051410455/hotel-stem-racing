import { sql } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { registrations as registrationsTable } from "@/lib/db/schema";
import { event } from "@/lib/event";
import { type AttendeeRole, attendeeRoles } from "./fields";

export type EventDayCounts = {
  /** ISO date of the Event Day. */
  eventDay: string;
  /** Registrations that chose this Event Day, for every Attendee Role (zeros included). */
  byRole: Record<AttendeeRole, number>;
  /** Registrations that chose this Event Day. */
  total: number;
};

export type RegistrationCounts = {
  /** One entry per configured Event Day, in Event order. */
  eventDays: EventDayCounts[];
  /** Distinct Registrations: one that chose both days counts once here, but on each day above. */
  registrations: number;
};

/** Head counts per Event Day by Attendee Role, for planning each day's crowd. */
export async function countByEventDayAndRole(db: Database): Promise<RegistrationCounts> {
  // One row per (Event Day, Attendee Role) that has Registrations; a two-day Registration
  // unnests into a row for each day it chose.
  const [rows, registrations] = await Promise.all([
    db.execute<{ eventDay: string; role: AttendeeRole; count: number }>(sql`
      select to_char(event_day, 'YYYY-MM-DD') as "eventDay", ${registrationsTable.role} as role,
        count(*)::int as count
      from ${registrationsTable}
        cross join lateral unnest(${registrationsTable.eventDays}) as event_day
      group by event_day, ${registrationsTable.role}
    `),
    db.$count(registrationsTable),
  ]);

  const eventDays = event.eventDays.map(({ date }) => {
    const byRole = Object.fromEntries(attendeeRoles.map((role) => [role, 0])) as Record<AttendeeRole, number>;
    for (const row of rows) if (row.eventDay === date) byRole[row.role] = row.count;
    const total = attendeeRoles.reduce((sum, role) => sum + byRole[role], 0);
    return { eventDay: date, byRole, total };
  });

  return { eventDays, registrations };
}
