// The Back Office CSV export as a file: Registrations in, CSV text out. Pure and browser-safe.
// English headers and option values; names and free text as the Attendee typed them, often Thai.
// Written for Excel: UTF-8 with a BOM (or Thai turns into mojibake), RFC 4180 quoting, CRLF.

import { bangkokDate, bangkokEnglishDateTime } from "@/lib/bangkok-time";
import { eventDayLabel } from "@/lib/event";
import type { RegistrationExportRow } from "./export";
import { attendeeRoleShortLabels, formatPhoneAsYouType, referralSourceShortLabels } from "./fields";

/** Without it, Excel reads UTF-8 as the system code page and Thai comes out garbled. */
const BOM = "﻿";
const CRLF = "\r\n";

/** Several choices in one cell. */
const joined = (labels: string[]) => labels.join("; ");

/**
 * "22 Oct 2026, 14:05" in Bangkok time, as in the list (the organisers' choice over Excel's
 * sortable "2026-10-22 14:05:09"). Excel keeps it as text: the rows come in the list's sort order.
 */
function bangkokDateTime(date: Date | null): string {
  return date ? bangkokEnglishDateTime(date) : "";
}

/** "+66812345678" → "081-234-5678", as Attendees typed it. */
function localPhone(e164: string): string {
  return e164.startsWith("+66") ? formatPhoneAsYouType(`0${e164.slice(3)}`) : e164;
}

/** The file's columns, in order: an English header and how each Registration fills it. */
const columns: { header: string; value: (row: RegistrationExportRow) => string | null }[] = [
  { header: "Registered (Bangkok time)", value: (row) => bangkokDateTime(row.createdAt) },
  { header: "Pass Code", value: (row) => row.passCode },
  { header: "Given name", value: (row) => row.givenName },
  { header: "Family name", value: (row) => row.familyName },
  { header: "Phone", value: (row) => localPhone(row.phone) },
  { header: "Phone (E.164)", value: (row) => row.phone },
  { header: "Email", value: (row) => row.email },
  { header: "Attendee Role", value: (row) => attendeeRoleShortLabels.en[row.role] },
  { header: "Attendee Role (other)", value: (row) => row.roleOther },
  { header: "School or organisation", value: (row) => row.organisation },
  {
    header: "Event Days",
    value: (row) => joined(row.eventDays.map((day) => eventDayLabel(day, "en"))),
  },
  {
    header: "Referral Sources",
    value: (row) => joined(row.referralSources.map((source) => referralSourceShortLabels.en[source])),
  },
  { header: "Referral Source (other)", value: (row) => row.referralOther },
  { header: "Team cheering for", value: (row) => row.competingTeamCheeredFor },
  { header: "Questions or suggestions", value: (row) => row.comments },
  { header: "Event Pass emails sent", value: (row) => String(row.emailSentCount) },
  { header: "Last Event Pass email (Bangkok time)", value: (row) => bangkokDateTime(row.lastEmailSentAt) },
];

/**
 * Spreadsheets run a cell starting with = + - @ (or a tab or CR before one) as a formula, so
 * Attendee-entered text such as `=HYPERLINK(…)` could act when Staff open the file. A leading
 * apostrophe keeps it text. The E.164 phone gets one too, which also stops Excel turning
 * "+66812345678" into the number 66812345678.
 */
const FORMULA_START = /^[=+\-@\t\r]/;

/** RFC 4180: a cell holding a comma, quote or line break is quoted, its quotes doubled. */
const NEEDS_QUOTES = /[",\r\n]/;

function csvCell(value: string | null): string {
  const text = value ?? "";
  const guarded = FORMULA_START.test(text) ? `'${text}` : text;
  return NEEDS_QUOTES.test(guarded) ? `"${guarded.replaceAll('"', '""')}"` : guarded;
}

function csvLine(cells: (string | null)[]): string {
  return cells.map(csvCell).join(",") + CRLF;
}

/** The export file's text: a BOM, the header row, then one line per Registration. */
export function registrationsCsv(rows: readonly RegistrationExportRow[]): string {
  const lines = [
    csvLine(columns.map((column) => column.header)),
    ...rows.map((row) => csvLine(columns.map((column) => column.value(row)))),
  ];
  return BOM + lines.join("");
}

/** "stem-racing-registrations-2026-10-25.csv": the Bangkok date of `exportedAt`. */
export function registrationsCsvFileName(exportedAt: Date): string {
  return `stem-racing-registrations-${bangkokDate(exportedAt)}.csv`;
}
