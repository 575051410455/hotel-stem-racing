import { sql } from "drizzle-orm";
import { bangkokDate, bangkokInstant } from "@/lib/bangkok-time";
import type { Database } from "@/lib/db/client";
import { registrations as registrationsTable } from "@/lib/db/schema";
import { event } from "@/lib/event";
import type { Clock } from "./ports";

export type DailyRegistrations = {
  /** ISO date of a Bangkok calendar day, e.g. "2026-10-23". */
  date: string;
  /** Registrations created on that day. */
  registrations: number;
}[];

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * New Registrations per Bangkok calendar day, for the Back Office chart: one entry per day from the
 * day of the earliest Registration to today (per the clock), with days that have none at zero.
 * Empty when there are no Registrations.
 */
export async function newRegistrationsPerDay(deps: { db: Database; clock: Clock }): Promise<DailyRegistrations> {
  const rows = await deps.db.execute<{ date: string; registrations: number }>(sql`
    select to_char(${registrationsTable.createdAt} at time zone ${event.timeZone}, 'YYYY-MM-DD') as date,
      count(*)::int as registrations
    from ${registrationsTable}
    group by 1
    order by 1
  `);
  if (rows.length === 0) return [];

  const perDay = new Map(rows.map(({ date, registrations }) => [date, registrations]));
  const today = bangkokDate(deps.clock());
  // Normally today. The database stamps `created_at` with its own time, which can pass midnight a
  // moment before the clock does; the series then runs to that day rather than drop Registrations.
  const lastRegistrationDay = rows[rows.length - 1].date;
  const last = lastRegistrationDay > today ? lastRegistrationDay : today;

  const series: DailyRegistrations = [];
  for (let day = rows[0].date; day <= last; day = nextDay(day)) {
    series.push({ date: day, registrations: perDay.get(day) ?? 0 });
  }
  return series;
}

/** The Bangkok calendar day after `isoDate`. */
function nextDay(isoDate: string): string {
  // From noon, a day later is always the next Bangkok day (Bangkok has no daylight saving anyway).
  return bangkokDate(new Date(bangkokInstant(isoDate, "12:00").getTime() + DAY_MS));
}
