// Check-In: recording that an Attendee arrived on an Event Day. Part of the Registration module;
// exposed as `checkIn` on `createRegistrations`.

import { and, eq } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { checkIns, registrations } from "@/lib/db/schema";
import { event } from "@/lib/event";
import { eventDayOn } from "./event-day-availability";
import { resolveScan } from "./event-pass-codec";
import type { AttendeeRole } from "./fields";
import type { Clock } from "./ports";

export type CheckInRequest = {
  /** What the scanner read or Staff typed: a token, a Pass Code or an Event Pass link. */
  scan: string;
  /** ISO date of the Event Day to check in for. Omitted: today's, by the clock in Bangkok. */
  eventDay?: string;
  /** The signed-in Staff Account (Better Auth user id), recorded on the Check-In. */
  staffAccountId: string;
};

/** Who was checked in, as Staff at the entrance need to see them. */
export type CheckedInAttendee = {
  givenName: string;
  familyName: string;
  role: AttendeeRole;
  passCode: string;
  /** ISO dates of the Event Days the Attendee chose when registering. */
  eventDays: string[];
};

export type CheckInResult =
  | { status: "checked-in"; eventDay: string; checkedInAt: Date; attendee: CheckedInAttendee }
  /** Recorded, but on an Event Day the Attendee didn't choose: Staff decide on the spot. */
  | {
      status: "checked-in-outside-registered-day";
      eventDay: string;
      checkedInAt: Date;
      attendee: CheckedInAttendee;
    }
  /** A repeat on the same Event Day: nothing new is recorded; `checkedInAt` is the original time. */
  | {
      status: "already-checked-in";
      eventDay: string;
      checkedInAt: Date;
      /** Whether the original Check-In was on an Event Day the Attendee didn't choose. */
      outsideRegisteredDay: boolean;
      attendee: CheckedInAttendee;
    }
  /** Unresolvable text, or a token or Pass Code no Registration has. Nothing is recorded. */
  | { status: "not-an-event-pass" }
  /**
   * No Event Day to check in for: none was chosen and today (Bangkok) isn't one, or the chosen
   * date isn't one. Checked before the scan; nothing is recorded.
   */
  | { status: "not-an-event-day" };

type CheckInDependencies = { db: Database; clock: Clock };

export type CheckInInspectionRequest = Pick<CheckInRequest, "scan" | "eventDay">;
export type CheckInInspection =
  | { status: "ready"; eventDay: string; attendee: CheckedInAttendee; outsideRegisteredDay: boolean }
  | Extract<CheckInResult, { status: "already-checked-in" | "not-an-event-pass" | "not-an-event-day" }>;

const notAnEventPass = { status: "not-an-event-pass" } as const satisfies CheckInResult;
const notAnEventDay = { status: "not-an-event-day" } as const satisfies CheckInResult;

function checkInDay(now: Date, chosen: string | undefined): string | undefined {
  return chosen === undefined
    ? eventDayOn(now)?.date
    : event.eventDays.find((day) => day.date === chosen)?.date;
}

async function findAttendee(db: Database, scan: string) {
  const resolved = resolveScan(scan);
  if (resolved.kind === "not-a-pass") return undefined;
  const [attendee] = await db
    .select({
      id: registrations.id,
      givenName: registrations.givenName,
      familyName: registrations.familyName,
      role: registrations.role,
      passCode: registrations.passCode,
      eventDays: registrations.eventDays,
    })
    .from(registrations)
    .where(
      resolved.kind === "token"
        ? eq(registrations.token, resolved.token)
        : eq(registrations.passCode, resolved.passCode),
    )
    .limit(1);
  return attendee;
}

async function findRecordedCheckIn(db: Database, registrationId: number, eventDay: string) {
  const [recorded] = await db
    .select({ checkedInAt: checkIns.checkedInAt, outsideRegisteredDay: checkIns.outsideRegisteredDay })
    .from(checkIns)
    .where(and(eq(checkIns.registrationId, registrationId), eq(checkIns.eventDay, eventDay)))
    .limit(1);
  return recorded;
}

/** Read-only Staff preview; confirmation still rechecks the pass and writes through checkIn. */
export function createCheckInInspection({ db, clock }: CheckInDependencies) {
  return async (request: CheckInInspectionRequest): Promise<CheckInInspection> => {
    const eventDay = checkInDay(clock(), request.eventDay);
    if (!eventDay) return notAnEventDay;
    const attendee = await findAttendee(db, request.scan);
    if (!attendee) return notAnEventPass;
    const { id, ...shown } = attendee;
    const recorded = await findRecordedCheckIn(db, id, eventDay);
    if (recorded) return { status: "already-checked-in", eventDay, attendee: shown, ...recorded };
    return {
      status: "ready",
      eventDay,
      attendee: shown,
      outsideRegisteredDay: !shown.eventDays.includes(eventDay),
    };
  };
}

export function createCheckIn({ db, clock }: CheckInDependencies) {
  return async function checkIn(request: CheckInRequest): Promise<CheckInResult> {
    const now = clock();
    const eventDay = checkInDay(now, request.eventDay);
    if (!eventDay) return notAnEventDay;

    const attendee = await findAttendee(db, request.scan);
    if (!attendee) return notAnEventPass;

    const { id: registrationId, ...shown } = attendee;
    const outsideRegisteredDay = !shown.eventDays.includes(eventDay);
    // One Check-In per Registration per Event Day: the unique constraint
    // check_ins_registrationId_eventDay_unique settles a repeat, even two Staff scanning at once.
    // A concurrent insert waits for the other to commit, then does nothing.
    const [recorded] = await db
      .insert(checkIns)
      .values({
        registrationId,
        eventDay,
        checkedInAt: now,
        staffAccountId: request.staffAccountId,
        outsideRegisteredDay,
      })
      .onConflictDoNothing({ target: [checkIns.registrationId, checkIns.eventDay] })
      .returning({ checkedInAt: checkIns.checkedInAt });

    if (recorded) {
      return {
        status: outsideRegisteredDay ? "checked-in-outside-registered-day" : "checked-in",
        eventDay,
        checkedInAt: recorded.checkedInAt,
        attendee: shown,
      };
    }

    const original = await findRecordedCheckIn(db, registrationId, eventDay);
    // Only when the Registration was deleted in between (its Check-Ins go with it).
    if (!original) return notAnEventPass;

    return { status: "already-checked-in", eventDay, ...original, attendee: shown };
  };
}
