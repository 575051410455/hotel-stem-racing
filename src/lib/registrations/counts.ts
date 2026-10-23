import { and, gte, lt, type SQLWrapper, sql } from "drizzle-orm";
import { bangkokDate, bangkokInstant } from "@/lib/bangkok-time";
import type { Database } from "@/lib/db/client";
import { checkIns as checkInsTable, registrations as registrationsTable } from "@/lib/db/schema";
import { event } from "@/lib/event";
import { type AttendeeRole, attendeeRoles } from "./fields";
import type { Clock } from "./ports";

export type EventDayCounts = {
  /** ISO date of the Event Day. */
  eventDay: string;
  /** Registrations that chose this Event Day, for every Attendee Role (zeros included). */
  byRole: Record<AttendeeRole, number>;
  /** Registrations that chose this Event Day. */
  total: number;
  checkIns: {
    /** Check-Ins recorded for this Event Day, whichever days the Attendees chose. */
    total: number;
    /** Those of them on a day the Attendee didn't choose: Staff let them in anyway. */
    outsideRegisteredDay: number;
  };
};

export type HeadCounts = {
  /** One entry per configured Event Day, in Event order. */
  eventDays: EventDayCounts[];
  /** Distinct Registrations: one that chose both days counts once here, but on each day above. */
  registrations: number;
  /** Registrations created on today's Bangkok calendar day, by the clock. */
  registeredToday: number;
};

type HeadCountDependencies = { db: Database; clock: Clock };

const DAY_MS = 24 * 60 * 60 * 1000;

/** `count(*)` of the rows matching `condition`, as a number. */
const countWhere = (condition: SQLWrapper | undefined) =>
  sql<number>`count(*) filter (where ${condition})::int`.mapWith(Number);

/**
 * Head counts for the overview on the Back Office home: Registrations per Event Day by Attendee
 * Role (for planning each day's crowd) with each day's Check-Ins, all Registrations and today's
 * new ones. A deleted Registration's Check-Ins are deleted with it, so they drop out too.
 */
export async function headCounts({ db, clock }: HeadCountDependencies): Promise<HeadCounts> {
  // Bangkok has no daylight saving, so its calendar day is always 24 hours long.
  const todayStart = bangkokInstant(bangkokDate(clock()));
  const tomorrowStart = new Date(todayStart.getTime() + DAY_MS);
  const createdToday = and(
    gte(registrationsTable.createdAt, todayStart),
    lt(registrationsTable.createdAt, tomorrowStart),
  );

  // One row per (Event Day, Attendee Role) that has Registrations; a two-day Registration
  // unnests into a row for each day it chose.
  const [rows, [totals], checkInRows] = await Promise.all([
    db.execute<{ eventDay: string; role: AttendeeRole; count: number }>(sql`
      select to_char(event_day, 'YYYY-MM-DD') as "eventDay", ${registrationsTable.role} as role,
        count(*)::int as count
      from ${registrationsTable}
        cross join lateral unnest(${registrationsTable.eventDays}) as event_day
      group by event_day, ${registrationsTable.role}
    `),
    db
      .select({
        registrations: sql<number>`count(*)::int`.mapWith(Number),
        registeredToday: countWhere(createdToday),
      })
      .from(registrationsTable),
    db
      .select({
        eventDay: checkInsTable.eventDay,
        total: sql<number>`count(*)::int`.mapWith(Number),
        outsideRegisteredDay: countWhere(checkInsTable.outsideRegisteredDay),
      })
      .from(checkInsTable)
      .groupBy(checkInsTable.eventDay),
  ]);

  const eventDays = event.eventDays.map(({ date }) => {
    const byRole = Object.fromEntries(attendeeRoles.map((role) => [role, 0])) as Record<AttendeeRole, number>;
    for (const row of rows) if (row.eventDay === date) byRole[row.role] = row.count;
    const total = attendeeRoles.reduce((sum, role) => sum + byRole[role], 0);
    const checkIns = checkInRows.find((row) => row.eventDay === date);
    return {
      eventDay: date,
      byRole,
      total,
      checkIns: { total: checkIns?.total ?? 0, outsideRegisteredDay: checkIns?.outsideRegisteredDay ?? 0 },
    };
  });

  return { eventDays, registrations: totals.registrations, registeredToday: totals.registeredToday };
}
