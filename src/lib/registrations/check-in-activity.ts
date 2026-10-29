import {
  and,
  arrayContains,
  asc,
  count,
  desc,
  eq,
  ilike,
  or,
  sql,
} from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { users } from "@/lib/db/auth-schema";
import { checkIns, registrations } from "@/lib/db/schema";
import { normalisePassCode } from "./event-pass-codec";
import type { AttendeeRole } from "./fields";

export type CheckInActivitySearch = {
  day: string;
  q?: string;
  role?: AttendeeRole;
  account?: string;
  outside?: boolean;
  page: number;
  pageSize: number;
};

/** A read-only history of successful Check-Ins; missing legacy attribution never hides arrival. */
export async function checkInActivity(
  db: Database,
  search: CheckInActivitySearch,
) {
  return db.transaction(
    async (tx) => {
      const q = search.q?.normalize("NFC").trim().replace(/\s+/g, " ");
      const pattern = q ? `%${q.replace(/[\\%_]/g, "\\$&")}%` : undefined;
      const code = q
        ? (normalisePassCode(q) ?? normalisePassCode(`EP${q}`))
        : null;
      const where = and(
        eq(checkIns.eventDay, search.day),
        search.role ? eq(registrations.role, search.role) : undefined,
        search.account
          ? eq(checkIns.staffAccountId, search.account)
          : undefined,
        search.outside === undefined
          ? undefined
          : eq(checkIns.outsideRegisteredDay, search.outside),
        pattern
          ? or(
              ilike(
                sql`${registrations.givenName} || ' ' || ${registrations.familyName}`,
                pattern,
              ),
              ilike(registrations.organisation, pattern),
              ilike(registrations.passCode, pattern),
              code ? eq(registrations.passCode, code) : undefined,
            )
          : undefined,
      );
      const [rows, [{ total }], [registered], [arrivals], accounts] =
        await Promise.all([
          tx
            .select({
              id: checkIns.id,
              givenName: registrations.givenName,
              familyName: registrations.familyName,
              passCode: registrations.passCode,
              role: registrations.role,
              organisation: registrations.organisation,
              checkedInAt: checkIns.checkedInAt,
              outsideRegisteredDay: checkIns.outsideRegisteredDay,
              accountId: checkIns.staffAccountId,
              accountName: users.name,
            })
            .from(checkIns)
            .innerJoin(
              registrations,
              eq(registrations.id, checkIns.registrationId),
            )
            .leftJoin(users, eq(users.id, checkIns.staffAccountId))
            .where(where)
            .orderBy(desc(checkIns.checkedInAt), desc(checkIns.id))
            .limit(search.pageSize)
            .offset((search.page - 1) * search.pageSize),
          tx
            .select({ total: count() })
            .from(checkIns)
            .innerJoin(
              registrations,
              eq(registrations.id, checkIns.registrationId),
            )
            .where(where),
          tx
            .select({ total: count() })
            .from(registrations)
            .where(arrayContains(registrations.eventDays, [search.day])),
          tx
            .select({
              total: count(),
              registered:
                sql<number>`count(*) filter (where ${arrayContains(registrations.eventDays, [search.day])})::int`.mapWith(
                  Number,
                ),
              outside:
                sql<number>`count(*) filter (where ${checkIns.outsideRegisteredDay})::int`.mapWith(
                  Number,
                ),
            })
            .from(checkIns)
            .innerJoin(
              registrations,
              eq(registrations.id, checkIns.registrationId),
            )
            .where(eq(checkIns.eventDay, search.day)),
          tx
            .selectDistinct({ id: users.id, name: users.name })
            .from(checkIns)
            .innerJoin(users, eq(users.id, checkIns.staffAccountId))
            .where(eq(checkIns.eventDay, search.day))
            .orderBy(asc(users.name), asc(users.id)),
        ]);
      return {
        rows,
        total,
        accounts,
        page: search.page,
        pageSize: search.pageSize,
        summary: {
          registered: registered.total,
          checkedInRegistered: arrivals.registered,
          awaiting: registered.total - arrivals.registered,
          outside: arrivals.outside,
          total: arrivals.total,
        },
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

export type CheckInActivityResult = Awaited<ReturnType<typeof checkInActivity>>;
