// Back Office CSV export: every Registration matching the list's search and filters, with every
// field Staff may see. Exposed as `registrations.exportRows()`; ./csv.ts turns the rows into a file.

import type { Database } from "@/lib/db/client";
import { registrations as registrationsTable } from "@/lib/db/schema";
import type { AttendeeRole, ReferralSource } from "./fields";
import type { RegistrationSearch } from "./search-params";
import { orderBy, searchFilter } from "./search";

/** The list's search, filters and sort; an export has no pages. */
export type RegistrationExportFilters = Pick<RegistrationSearch, "q" | "day" | "role" | "sort">;

/**
 * One Registration as exported. Leaves out the Event Pass token (it opens the Event Pass, so a
 * shared file must not carry it) and the internal Duplicate Registration key.
 */
export type RegistrationExportRow = {
  createdAt: Date;
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
  referralOther: string | null;
  competingTeamCheeredFor: string | null;
  accessibilityNeeds: string | null;
  comments: string | null;
  /** How many Event Pass emails were sent; 0 means none yet. */
  emailSentCount: number;
  lastEmailSentAt: Date | null;
};

const exportColumns = {
  createdAt: registrationsTable.createdAt,
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
  accessibilityNeeds: registrationsTable.accessibilityNeeds,
  comments: registrationsTable.comments,
  emailSentCount: registrationsTable.emailSentCount,
  lastEmailSentAt: registrationsTable.lastEmailSentAt,
};

/** Every match, in the list's order: the same search, filters and sort as ./search.ts, unpaged. */
export async function exportRegistrations(
  db: Database,
  filters: RegistrationExportFilters,
): Promise<RegistrationExportRow[]> {
  return db
    .select(exportColumns)
    .from(registrationsTable)
    .where(searchFilter(filters))
    .orderBy(...orderBy(filters.sort));
}
