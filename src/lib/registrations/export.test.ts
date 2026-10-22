import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { createTestDatabase } from "@/test-support/database";
import type { RegistrationForm } from "./fields";
import { createRegistrations } from "./registrations";

describe("Registration module: exporting Registrations", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let registrations: ReturnType<typeof createRegistrations>;

  before(async () => {
    database = await createTestDatabase();
    registrations = createRegistrations({ db: database.db, clock: beforeTheEvent });
  });

  beforeEach(async () => {
    await database.reset();
  });

  after(async () => {
    await database.drop();
  });

  async function register(changes: Partial<RegistrationForm> = {}) {
    const result = await registrations.submit({ ...attendee, ...changes });
    assert.equal(result.status, "accepted", JSON.stringify(result));
  }

  test("exports a Registration with every field", async () => {
    await register({
      givenName: "สมศรี",
      familyName: "รักเรียน",
      phone: "02-123-4567",
      email: "somsri@school.ac.th",
      role: "other",
      roleOther: "ศิษย์เก่า",
      organisation: "โรงเรียนนนทบุรีวิทยาลัย",
      eventDays: ["2026-10-31", "2026-11-01"],
      referralSources: ["line", "other"],
      referralOther: "ป้ายหน้างาน",
      competingTeamCheeredFor: "Thunder Bolt",
      accessibilityNeeds: "รถเข็น",
      comments: "จอดรถได้ที่ไหน",
    });

    const [row, ...others] = await registrations.exportRows({});

    assert.deepEqual(others, []);
    assert.ok(row.createdAt instanceof Date);
    assert.match(row.passCode, /^EP-[A-Z2-9]{8}$/);
    const { createdAt, passCode, ...fields } = row;
    void createdAt;
    void passCode;
    assert.deepEqual(fields, {
      givenName: "สมศรี",
      familyName: "รักเรียน",
      phone: "+6621234567",
      email: "somsri@school.ac.th",
      role: "other",
      roleOther: "ศิษย์เก่า",
      organisation: "โรงเรียนนนทบุรีวิทยาลัย",
      eventDays: ["2026-10-31", "2026-11-01"],
      referralSources: ["line", "other"],
      referralOther: "ป้ายหน้างาน",
      competingTeamCheeredFor: "Thunder Bolt",
      accessibilityNeeds: "รถเข็น",
      comments: "จอดรถได้ที่ไหน",
      emailSentCount: 0,
      lastEmailSentAt: null,
    });
  });

  /** "given family" of each exported row, in file order. */
  async function namesExported(filters: Parameters<typeof registrations.exportRows>[0] = {}) {
    const rows = await registrations.exportRows(filters);
    return rows.map((row) => `${row.givenName} ${row.familyName}`);
  }

  test("exports only what matches the search, Event Day and Attendee Role, as the list does", async () => {
    await register({ givenName: "วิชัย", familyName: "ใจดี", role: "parent", eventDays: ["2026-10-31"] });
    await register({
      givenName: "วิภา",
      familyName: "ใจดี",
      phone: "089-876-5432",
      role: "teacher",
      eventDays: ["2026-11-01"],
    });
    await register({
      givenName: "สมศรี",
      familyName: "รักเรียน",
      phone: "02-123-4567",
      role: "teacher",
      eventDays: ["2026-10-31", "2026-11-01"],
    });

    assert.deepEqual(await namesExported({ q: "ใจดี" }), ["วิภา ใจดี", "วิชัย ใจดี"]);
    assert.deepEqual(await namesExported({ q: "089-876" }), ["วิภา ใจดี"]);
    assert.deepEqual(await namesExported({ day: "2026-10-31" }), ["สมศรี รักเรียน", "วิชัย ใจดี"]);
    assert.deepEqual(await namesExported({ role: "teacher" }), ["สมศรี รักเรียน", "วิภา ใจดี"]);
    assert.deepEqual(
      await namesExported({ q: "ใจดี", day: "2026-11-01", role: "teacher" }),
      ["วิภา ใจดี"],
    );
    assert.deepEqual(await namesExported({ q: "ไม่มีใคร" }), []);
  });

  test("exports in the list's sort order, newest first by default", async () => {
    await register({ givenName: "วิชัย", familyName: "ใจดี" });
    await register({ givenName: "สมศรี", familyName: "รักเรียน", phone: "089-876-5432" });
    await register({ givenName: "Alice", familyName: "Smith", phone: "02-123-4567" });

    assert.deepEqual(await namesExported(), ["Alice Smith", "สมศรี รักเรียน", "วิชัย ใจดี"]);
    assert.deepEqual(await namesExported({ sort: "createdAt.asc" }), [
      "วิชัย ใจดี",
      "สมศรี รักเรียน",
      "Alice Smith",
    ]);
    // Thai dictionary order, Latin after Thai: ใจดี files under จ, before รักเรียน.
    assert.deepEqual(await namesExported({ sort: "familyName.asc" }), [
      "วิชัย ใจดี",
      "สมศรี รักเรียน",
      "Alice Smith",
    ]);
  });

  test("exports every match, more than the list's largest page", async () => {
    for (let i = 0; i < 105; i++) {
      await register({ phone: `081234${String(i).padStart(4, "0")}`, role: i < 103 ? "student" : "parent" });
    }

    assert.equal((await registrations.exportRows({})).length, 105);
    assert.equal((await registrations.exportRows({ role: "student" })).length, 103);
  });
});

/** Before the Event, so every Event Day is still open for registration. */
const beforeTheEvent = () => new Date("2026-10-22T12:00:00+07:00");

const attendee: RegistrationForm = {
  givenName: "วิชัย",
  familyName: "ใจดี",
  phone: "081-234-5678",
  email: "wichai@example.com",
  role: "parent",
  roleOther: "",
  organisation: "",
  eventDays: ["2026-10-31"],
  referralSources: ["facebook"],
  referralOther: "",
  competingTeamCheeredFor: "",
  accessibilityNeeds: "",
  comments: "",
};
