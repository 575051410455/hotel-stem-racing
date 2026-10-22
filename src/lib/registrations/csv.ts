// The Back Office CSV export as a file: Registrations in, CSV text out. Pure and browser-safe.
// Written for Excel: UTF-8 with a BOM (or Thai turns into mojibake), RFC 4180 quoting, CRLF.

import { event } from "@/lib/event";
import type { RegistrationExportRow } from "./export";
import {
  type AttendeeRole,
  attendeeRoleLabels,
  formatPhoneAsYouType,
  type ReferralSource,
  referralSourceLabels,
} from "./fields";

/** Without it, Excel reads UTF-8 as the system code page and Thai comes out garbled. */
const BOM = "﻿";
const CRLF = "\r\n";

/** The form's "Other" labels ask the Attendee to specify; in a file it is just "Other". */
const roleLabels: Record<AttendeeRole, string> = { ...attendeeRoleLabels, other: "อื่น ๆ" };
const referralLabels: Record<ReferralSource, string> = { ...referralSourceLabels, other: "อื่น ๆ" };

const eventDayLabels: Record<string, string> = Object.fromEntries(
  event.eventDays.map((day) => [day.date, day.label]),
);

/** Several choices in one cell. */
const joined = (labels: string[]) => labels.join("; ");

const bangkokParts = new Intl.DateTimeFormat("en-US", {
  timeZone: event.timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Bangkok calendar date and clock time of `date`, e.g. "2026-10-22" and "14:05:09". */
function inBangkok(date: Date) {
  const part = Object.fromEntries(
    bangkokParts.formatToParts(date).map(({ type, value }) => [type, value]),
  );
  return {
    date: `${part.year}-${part.month}-${part.day}`,
    time: `${part.hour}:${part.minute}:${part.second}`,
  };
}

/** "2026-10-22 14:05:09" in Bangkok time, a form Excel reads as a date and time. */
function bangkokDateTime(date: Date | null): string {
  if (!date) return "";
  const { date: day, time } = inBangkok(date);
  return `${day} ${time}`;
}

/** "+66812345678" → "081-234-5678", as Attendees typed it. */
function localPhone(e164: string): string {
  return e164.startsWith("+66") ? formatPhoneAsYouType(`0${e164.slice(3)}`) : e164;
}

/** The file's columns, in order: a Thai header and how each Registration fills it. */
const columns: { header: string; value: (row: RegistrationExportRow) => string | null }[] = [
  { header: "ลงทะเบียนเมื่อ", value: (row) => bangkokDateTime(row.createdAt) },
  { header: "รหัส Event Pass", value: (row) => row.passCode },
  { header: "ชื่อ", value: (row) => row.givenName },
  { header: "นามสกุล", value: (row) => row.familyName },
  { header: "เบอร์โทรศัพท์", value: (row) => localPhone(row.phone) },
  { header: "เบอร์โทรศัพท์ (E.164)", value: (row) => row.phone },
  { header: "อีเมล", value: (row) => row.email },
  { header: "ฐานะการเข้าร่วมงาน", value: (row) => roleLabels[row.role] },
  { header: "ฐานะการเข้าร่วมงาน (ระบุ)", value: (row) => row.roleOther },
  { header: "โรงเรียน / สถาบันการศึกษา / บริษัท / หน่วยงาน", value: (row) => row.organisation },
  {
    header: "วันเข้าร่วมงาน",
    value: (row) => joined(row.eventDays.map((day) => eventDayLabels[day] ?? day)),
  },
  {
    header: "ช่องทางที่ทราบข่าว",
    value: (row) => joined(row.referralSources.map((source) => referralLabels[source])),
  },
  { header: "ช่องทางที่ทราบข่าว (ระบุ)", value: (row) => row.referralOther },
  { header: "ทีมที่ต้องการมาเชียร์", value: (row) => row.competingTeamCheeredFor },
  { header: "ความช่วยเหลือที่ต้องการ", value: (row) => row.accessibilityNeeds },
  { header: "ข้อสอบถามหรือข้อเสนอแนะ", value: (row) => row.comments },
  { header: "ส่งอีเมล Event Pass แล้ว (ครั้ง)", value: (row) => String(row.emailSentCount) },
  { header: "ส่งอีเมล Event Pass ล่าสุดเมื่อ", value: (row) => bangkokDateTime(row.lastEmailSentAt) },
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

/** The export file's text: a BOM, the Thai header row, then one line per Registration. */
export function registrationsCsv(rows: readonly RegistrationExportRow[]): string {
  const lines = [
    csvLine(columns.map((column) => column.header)),
    ...rows.map((row) => csvLine(columns.map((column) => column.value(row)))),
  ];
  return BOM + lines.join("");
}

/** "stem-racing-registrations-2026-10-25.csv": the Bangkok date of `exportedAt`. */
export function registrationsCsvFileName(exportedAt: Date): string {
  return `stem-racing-registrations-${inBangkok(exportedAt).date}.csv`;
}
