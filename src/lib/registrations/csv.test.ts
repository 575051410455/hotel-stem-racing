import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { registrationsCsv, registrationsCsvFileName } from "./csv";
import type { RegistrationExportRow } from "./export";

/** The byte order mark Excel needs to read the file as UTF-8 (EF BB BF once encoded). */
const BOM = "﻿";

const HEADER =
  "ลงทะเบียนเมื่อ,รหัส Event Pass,ชื่อ,นามสกุล,เบอร์โทรศัพท์,เบอร์โทรศัพท์ (E.164),อีเมล," +
  "ฐานะการเข้าร่วมงาน,ฐานะการเข้าร่วมงาน (ระบุ),โรงเรียน / สถาบันการศึกษา / บริษัท / หน่วยงาน," +
  "วันเข้าร่วมงาน,ช่องทางที่ทราบข่าว,ช่องทางที่ทราบข่าว (ระบุ),ทีมที่ต้องการมาเชียร์," +
  "ความช่วยเหลือที่ต้องการ,ข้อสอบถามหรือข้อเสนอแนะ,ส่งอีเมล Event Pass แล้ว (ครั้ง)," +
  "ส่งอีเมล Event Pass ล่าสุดเมื่อ";

describe("Registration CSV", () => {
  test("starts with a BOM and a Thai header row, each line ending in CRLF", () => {
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
        "2026-10-22 14:05:09,EP-7KQ2MZ9H,วิชัย,ใจดี,081-234-5678,'+66812345678,wichai@example.com," +
        "ผู้ปกครอง,ครู-อาจารย์,'=1+2,วันที่ 31 ตุลาคม 2569,Facebook,'@SUM(A1),'+1,'-2,'\tเริ่มด้วยแท็บ,0,\r\n",
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
        "2026-10-22 14:05:09,EP-7KQ2MZ9H,วิชัย,ใจดี,081-234-5678,'+66812345678,wichai@example.com," +
        'ผู้ปกครอง,,"บริษัท ก, จำกัด",วันที่ 31 ตุลาคม 2569,Facebook,"ป้าย ""STEM""","ทีม A\r\nทีม B",' +
        '"\'=HYPERLINK(""http://x.example"",""y"")","บรรทัดแรก\nบรรทัดสอง",0,\r\n',
    );
  });

  test("writes Thai labels for roles, Event Days and Referral Sources, and Bangkok times, in row order", () => {
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
        "2026-10-22 14:05:09,EP-7KQ2MZ9H,วิชัย,ใจดี,081-234-5678,'+66812345678,wichai@example.com," +
        "อื่น ๆ,ศิษย์เก่า,,วันที่ 31 ตุลาคม 2569; วันที่ 1 พฤศจิกายน 2569," +
        "LINE; ทีมที่เข้าร่วมการแข่งขัน; อื่น ๆ,ป้ายหน้างาน,,,,2,2026-10-23 00:30:00\r\n" +
        "2026-10-23 09:00:00,EP-ABCDEFGH,Alice,Smith,02-123-4567,'+6621234567,alice@example.com," +
        "สปอนเซอร์ / ผู้สนับสนุน,,Grand Richmond,วันที่ 1 พฤศจิกายน 2569,เว็บไซต์,,,,,0,\r\n",
    );
  });

  test("an international phone number is written as E.164 in both phone columns", () => {
    const [, row] = registrationsCsv([{ ...wichai, phone: "+447700900123" }]).split("\r\n");
    const [, , , , localPhone, e164Phone] = row.split(",");

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

/** Registered at 14:05:09 Bangkok time; every optional field empty. */
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
