import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { registrationsCsv, registrationsCsvFileName } from "./csv";
import type { RegistrationExportRow } from "./export";

/** The byte order mark Excel needs to read the file as UTF-8 (EF BB BF once encoded). */
const BOM = "﻿";

/** The headers in copy-back-office.md ("CSV export"), in order. */
const HEADER =
  "Registered (Bangkok time),Pass Code,Given name,Family name,Phone,Phone (E.164),Email," +
  "Attendee Role,Attendee Role (other),School or organisation," +
  "Event Days,Referral Sources,Referral Source (other),Team cheering for," +
  "Help needed,Questions or suggestions,Event Pass emails sent," +
  "Last Event Pass email (Bangkok time)";

/** A line's cells: split on the commas outside quotes, such as the one in "22 Oct 2026, 14:05". */
const cellsOf = (line: string) => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);

describe("Registration CSV", () => {
  test("starts with a BOM and an English header row, each line ending in CRLF", () => {
    assert.equal(registrationsCsv([]), `${BOM}${HEADER}\r\n`);
  });

  test("prefixes cells that a spreadsheet would run as a formula with an apostrophe", () => {
    const csv = registrationsCsv([
      {
        ...wichai,
        roleOther: "ครู-อาจารย์",
        organisation: "=1+2",
        referralOther: "@SUM(A1)",
        competingTeamCheeredFor: "+1",
        accessibilityNeeds: "-2",
        comments: "\tเริ่มด้วยแท็บ",
      },
    ]);

    assert.equal(
      csv,
      `${BOM}${HEADER}\r\n` +
        "\"22 Oct 2026, 14:05\",EP-7KQ2MZ9H,วิชัย,ใจดี,081-234-5678,'+66812345678,wichai@example.com," +
        "Parent,ครู-อาจารย์,'=1+2,Saturday 31 October 2026,Facebook,'@SUM(A1),'+1,'-2,'\tเริ่มด้วยแท็บ,0,\r\n",
    );
  });

  test("quotes cells with commas, quotes or line breaks, doubling the quotes inside", () => {
    const csv = registrationsCsv([
      {
        ...wichai,
        organisation: "บริษัท ก, จำกัด",
        referralOther: 'ป้าย "STEM"',
        competingTeamCheeredFor: "ทีม A\r\nทีม B",
        accessibilityNeeds: '=HYPERLINK("http://x.example","y")',
        comments: "บรรทัดแรก\nบรรทัดสอง",
      },
    ]);

    assert.equal(
      csv,
      `${BOM}${HEADER}\r\n` +
        "\"22 Oct 2026, 14:05\",EP-7KQ2MZ9H,วิชัย,ใจดี,081-234-5678,'+66812345678,wichai@example.com," +
        'Parent,,"บริษัท ก, จำกัด",Saturday 31 October 2026,Facebook,"ป้าย ""STEM""","ทีม A\r\nทีม B",' +
        '"\'=HYPERLINK(""http://x.example"",""y"")","บรรทัดแรก\nบรรทัดสอง",0,\r\n',
    );
  });

  test("writes English Attendee Roles, Event Days and Referral Sources, Thai names as typed, and Bangkok times, in row order", () => {
    const csv = registrationsCsv([
      {
        ...wichai,
        role: "other",
        roleOther: "ศิษย์เก่า",
        eventDays: ["2026-10-31", "2026-11-01"],
        referralSources: ["line", "competing_team", "other"],
        referralOther: "ป้ายหน้างาน",
        emailSentCount: 2,
        // 00:30 the next day in Bangkok.
        lastEmailSentAt: new Date("2026-10-22T17:30:00Z"),
      },
      {
        ...wichai,
        createdAt: new Date("2026-10-23T02:00:00Z"),
        passCode: "EP-ABCDEFGH",
        givenName: "Alice",
        familyName: "Smith",
        phone: "+6621234567",
        email: "alice@example.com",
        role: "sponsor",
        organisation: "Grand Richmond",
        eventDays: ["2026-11-01"],
        referralSources: ["website"],
      },
    ]);

    assert.equal(
      csv,
      `${BOM}${HEADER}\r\n` +
        "\"22 Oct 2026, 14:05\",EP-7KQ2MZ9H,วิชัย,ใจดี,081-234-5678,'+66812345678,wichai@example.com," +
        "Other,ศิษย์เก่า,,Saturday 31 October 2026; Sunday 1 November 2026," +
        "LINE; A Competing Team; Other,ป้ายหน้างาน,,,,2,\"23 Oct 2026, 00:30\"\r\n" +
        "\"23 Oct 2026, 09:00\",EP-ABCDEFGH,Alice,Smith,02-123-4567,'+6621234567,alice@example.com," +
        "Sponsor / Supporter,,Grand Richmond,Sunday 1 November 2026,Website,,,,,0,\r\n",
    );
  });

  test("writes every Attendee Role and Referral Source as its English label", () => {
    const csv = registrationsCsv(
      (["parent", "teacher", "student", "sponsor", "other"] as const).map((role) => ({
        ...wichai,
        role,
        referralSources: [
          "facebook",
          "instagram",
          "tiktok",
          "line",
          "website",
          "school",
          "organisation",
          "friend",
          "competing_team",
          "other",
        ],
      })),
    );
    const rows = csv.split("\r\n").slice(1, -1).map(cellsOf);
    const roleColumn = 7;
    const referralSourcesColumn = 11;

    assert.deepEqual(
      rows.map((cells) => cells[roleColumn]),
      ["Parent", "Teacher / Lecturer", "Student", "Sponsor / Supporter", "Other"],
    );
    assert.equal(
      rows[0][referralSourcesColumn],
      "Facebook; Instagram; TikTok; LINE; Website; School or university; Company or organisation; " +
        "Friend or acquaintance; A Competing Team; Other",
    );
  });

  test("an international phone number is written as E.164 in both phone columns", () => {
    const [, row] = registrationsCsv([{ ...wichai, phone: "+447700900123" }]).split("\r\n");
    const [, , , , localPhone, e164Phone] = cellsOf(row);

    assert.equal(localPhone, "'+447700900123");
    assert.equal(e164Phone, "'+447700900123");
  });

  test("names the file after the Bangkok date it was exported on", () => {
    // 00:30 on 25 October in Bangkok, still the 24th in UTC.
    assert.equal(
      registrationsCsvFileName(new Date("2026-10-24T17:30:00Z")),
      "stem-racing-registrations-2026-10-25.csv",
    );
    assert.equal(
      registrationsCsvFileName(new Date("2026-10-25T16:59:59Z")),
      "stem-racing-registrations-2026-10-25.csv",
    );
  });
});

/** Registered at 14:05:09 Bangkok time (the CSV drops the seconds); every optional field empty. */
const wichai: RegistrationExportRow = {
  createdAt: new Date("2026-10-22T07:05:09Z"),
  passCode: "EP-7KQ2MZ9H",
  givenName: "วิชัย",
  familyName: "ใจดี",
  phone: "+66812345678",
  email: "wichai@example.com",
  role: "parent",
  roleOther: null,
  organisation: null,
  eventDays: ["2026-10-31"],
  referralSources: ["facebook"],
  referralOther: null,
  competingTeamCheeredFor: null,
  accessibilityNeeds: null,
  comments: null,
  emailSentCount: 0,
  lastEmailSentAt: null,
};
