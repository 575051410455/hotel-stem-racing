// Back Office search of Registrations: free-text search, Event Day and Attendee Role filters,
// sorting and pagination, all in the database. Exposed as `registrations.search()`.

import {
  and,
  type AnyColumn,
  arrayContains,
  asc,
  count,
  desc,
  eq,
  ilike,
  like,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { registrations as registrationsTable } from "@/lib/db/schema";
import { normalisePassCode } from "./event-pass-codec";
import type { AttendeeRole } from "./fields";
import {
  clampPage,
  clampPageSize,
  DEFAULT_REGISTRATION_SORT,
  type RegistrationSearch,
  type RegistrationSort,
  type RegistrationSortColumn,
} from "./search-params";

/** One row of the Back Office Registration list. */
export type RegistrationListRow = {
  id: number;
  createdAt: Date;
  givenName: string;
  familyName: string;
  role: AttendeeRole;
  /** The Attendee's own words when the Attendee Role is "other"; otherwise null. */
  roleOther: string | null;
  /** ISO dates of the chosen Event Days. */
  eventDays: string[];
  /** E.164, e.g. "+66812345678". */
  phone: string;
  email: string;
  passCode: string;
};

export type RegistrationSearchResult = {
  rows: RegistrationListRow[];
  /** Every Registration matching the search and filters, across all pages. */
  total: number;
  /** The page and page size actually used, after clamping. */
  page: number;
  pageSize: number;
};

const listColumns = {
  id: registrationsTable.id,
  createdAt: registrationsTable.createdAt,
  givenName: registrationsTable.givenName,
  familyName: registrationsTable.familyName,
  role: registrationsTable.role,
  roleOther: registrationsTable.roleOther,
  eventDays: registrationsTable.eventDays,
  phone: registrationsTable.phone,
  email: registrationsTable.email,
  passCode: registrationsTable.passCode,
};

/** Collapses whitespace and NFC-normalises, as names are stored. Empty means no search. */
function normaliseQuery(q: string | undefined): string {
  return (q ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
}

/** A case-insensitive "contains" pattern; % and _ typed by Staff match themselves. */
function containing(text: string): string {
  return `%${text.replace(/[\\%_]/g, "\\$&")}%`;
}

/**
 * LIKE patterns for the stored E.164 phone ("+66812345678") when `q` looks like a phone number:
 * digits with optional spaces, dashes and a leading +. Local numbers ("081-234…") match from the
 * start; any run of digits ("5678", "+66 81 234…") matches anywhere.
 */
function phonePatterns(q: string): string[] {
  const compact = q.replace(/[\s-]+/g, "");
  if (!/^\+?\d+$/.test(compact)) return [];
  const digits = compact.replace(/^\+/, "");
  const patterns = [`%${digits}%`];
  // National form: the trunk 0 stands for +66.
  if (digits.startsWith("0")) patterns.push(`+66${digits.slice(1)}%`);
  // "+66 081…": the trunk 0 kept after the country code, as the form also accepts.
  if (digits.startsWith("660")) patterns.push(`+66${digits.slice(3)}%`);
  return patterns;
}

/** The stored Pass Code `q` stands for, typed with or without "EP", in any case and spacing. */
function passCodeFor(q: string): string | null {
  return normalisePassCode(q) ?? normalisePassCode(`EP${q}`);
}

/** Each way `q` can match a Registration; any one is enough. */
function matchesQuery(q: string): SQL {
  const { givenName, familyName, email, phone, passCode } = registrationsTable;
  const exactPassCode = passCodeFor(q);
  const pattern = containing(q);
  return or(
    // Given name, family name, or both as written on the Event Pass ("วิชัย ใจดี").
    ilike(sql`${givenName} || ' ' || ${familyName}`, pattern),
    ilike(email, pattern),
    ...phonePatterns(q).map((phonePattern) => like(phone, phonePattern)),
    // Part of a Pass Code as printed ("EP-7KQ", "7kq2"), or the whole one however it was typed.
    ilike(passCode, pattern),
    exactPassCode ? eq(passCode, exactPassCode) : undefined,
  )!;
}

/**
 * Names compare in Thai dictionary order (ICU), where a leading vowel such as ใ or เ files under
 * the consonant after it and Latin letters ignore case. PostgreSQL's default collation compares
 * code points instead. Needs an ICU-enabled PostgreSQL (the default build since 16).
 */
const thaiOrder = (column: AnyColumn) => sql`${column} collate "th-TH-x-icu"`;

/** What each sortable column orders by; later keys break ties, and the id always ends the list. */
const sortKeys: Record<RegistrationSortColumn, (AnyColumn | SQL)[]> = {
  createdAt: [registrationsTable.createdAt],
  familyName: [thaiOrder(registrationsTable.familyName), thaiOrder(registrationsTable.givenName)],
  givenName: [thaiOrder(registrationsTable.givenName), thaiOrder(registrationsTable.familyName)],
};

/** ORDER BY for `sort`. Anything but an allowed column and direction means newest first. */
function orderBy(sort: RegistrationSort | undefined): SQL[] {
  const [column, direction] = (sort ?? DEFAULT_REGISTRATION_SORT).split(".");
  const keys = Object.hasOwn(sortKeys, column) ? sortKeys[column as RegistrationSortColumn] : null;
  if (!keys || (direction !== "asc" && direction !== "desc")) {
    return orderBy(DEFAULT_REGISTRATION_SORT);
  }
  const order = direction === "asc" ? asc : desc;
  return [...keys, registrationsTable.id].map((key) => order(key));
}

export async function searchRegistrations(
  db: Database,
  search: RegistrationSearch,
): Promise<RegistrationSearchResult> {
  const page = clampPage(search.page);
  const pageSize = clampPageSize(search.pageSize);
  const conditions: SQL[] = [];
  const q = normaliseQuery(search.q);
  if (q) conditions.push(matchesQuery(q));
  if (search.day) conditions.push(arrayContains(registrationsTable.eventDays, [search.day]));
  if (search.role) conditions.push(eq(registrationsTable.role, search.role));
  const where = and(...conditions);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select(listColumns)
      .from(registrationsTable)
      .where(where)
      .orderBy(...orderBy(search.sort))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(registrationsTable).where(where),
  ]);

  return { rows, total, page, pageSize };
}
