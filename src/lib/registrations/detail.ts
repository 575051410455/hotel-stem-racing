// Back Office detail and delete of one Registration: every answer, the Pass Code, the email
// status and its Check-Ins; and removing spam or a Duplicate Registration. Part of the
// Registration module; exposed as `getRegistrationDetail` and `deleteRegistration` on
// `createRegistrations`.

import { asc, eq } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { checkIns as checkInsTable, registrations as registrationsTable } from "@/lib/db/schema";
import type { AttendeeRole, ReferralSource } from "./fields";
import { isRegistrationId } from "./registration-id";

/** One Check-In of the Registration, as Staff see it. */
export type RegistrationCheckIn = {
  /** ISO date of the Event Day it was recorded for. */
  eventDay: string;
  checkedInAt: Date;
  /** The Attendee hadn't chosen this Event Day when registering. */
  outsideRegisteredDay: boolean;
};

/** Everything Staff may see about one Registration. Only the Duplicate Registration key is left out. */
export type RegistrationDetail = {
  id: number;
  createdAt: Date;
  /** Opens the Event Pass (`/p/{token}`); show it to Staff only. */
  token: string;
  passCode: string;
  givenName: string;
  familyName: string;
  /** E.164, e.g. "+66812345678". */
  phone: string;
  email: string;
  role: AttendeeRole;
  /** The Attendee's own words when the Attendee Role is "other"; otherwise null. */
  roleOther: string | null;
  organisation: string | null;
  /** ISO dates of the chosen Event Days, in Event order. */
  eventDays: string[];
  referralSources: ReferralSource[];
  /** The Attendee's own words when a Referral Source is "other"; otherwise null. */
  referralOther: string | null;
  competingTeamCheeredFor: string | null;
  comments: string | null;
  pdpaAcknowledgedAt: Date | null;
  pdpaNoticeVersion: string | null;
  pdpaPolicyUrl: string | null;
  /** How many Event Pass emails were sent; 0 means none yet. */
  emailSentCount: number;
  lastEmailSentAt: Date | null;
  /** In Event Day order; empty until the Attendee is checked in. */
  checkIns: RegistrationCheckIn[];
};

export type RegistrationDetailLookup =
  | { status: "found"; registration: RegistrationDetail }
  /** No Registration has this id, for example because it was deleted. */
  | { status: "not-found" };

const notFound = { status: "not-found" } as const;

const detailColumns = {
  id: registrationsTable.id,
  createdAt: registrationsTable.createdAt,
  token: registrationsTable.token,
  passCode: registrationsTable.passCode,
  givenName: registrationsTable.givenName,
  familyName: registrationsTable.familyName,
  phone: registrationsTable.phone,
  email: registrationsTable.email,
  role: registrationsTable.role,
  roleOther: registrationsTable.roleOther,
  organisation: registrationsTable.organisation,
  eventDays: registrationsTable.eventDays,
  referralSources: registrationsTable.referralSources,
  referralOther: registrationsTable.referralOther,
  competingTeamCheeredFor: registrationsTable.competingTeamCheeredFor,
  comments: registrationsTable.comments,
  pdpaAcknowledgedAt: registrationsTable.pdpaAcknowledgedAt,
  pdpaNoticeVersion: registrationsTable.pdpaNoticeVersion,
  pdpaPolicyUrl: registrationsTable.pdpaPolicyUrl,
  emailSentCount: registrationsTable.emailSentCount,
  lastEmailSentAt: registrationsTable.lastEmailSentAt,
};

/** The Registration with this id, with its Check-Ins, or not found. */
export async function getRegistrationDetail(db: Database, id: number): Promise<RegistrationDetailLookup> {
  if (!isRegistrationId(id)) return notFound;

  // Both read by id alone, so they run together: one round trip instead of two.
  const [[registration], checkIns] = await Promise.all([
    db.select(detailColumns).from(registrationsTable).where(eq(registrationsTable.id, id)).limit(1),
    db
      .select({
        eventDay: checkInsTable.eventDay,
        checkedInAt: checkInsTable.checkedInAt,
        outsideRegisteredDay: checkInsTable.outsideRegisteredDay,
      })
      .from(checkInsTable)
      .where(eq(checkInsTable.registrationId, id))
      .orderBy(asc(checkInsTable.eventDay)),
  ]);
  if (!registration) return notFound;

  return { status: "found", registration: { ...registration, checkIns } };
}

export type DeleteRegistrationResult =
  /** Gone, with its Check-Ins; its Event Pass no longer opens or checks in. */
  | { status: "deleted"; passCode: string }
  /** No Registration has this id, for example because another Staff member deleted it first. */
  | { status: "not-found" };

/**
 * Deletes the Registration with this id, for spam or a Duplicate Registration. Its Check-Ins go
 * with it (the foreign key cascades). There is no undo.
 */
export async function deleteRegistration(db: Database, id: number): Promise<DeleteRegistrationResult> {
  if (!isRegistrationId(id)) return notFound;

  const [deleted] = await db
    .delete(registrationsTable)
    .where(eq(registrationsTable.id, id))
    .returning({ passCode: registrationsTable.passCode });
  return deleted ? { status: "deleted", passCode: deleted.passCode } : notFound;
}
