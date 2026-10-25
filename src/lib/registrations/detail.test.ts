import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import { checkIns as checkInsTable, registrations as registrationsTable } from "@/lib/db/schema";
import { createTestDatabase } from "@/test-support/database";
import type { RegistrationForm } from "./fields";
import { PDPA_NOTICE_VERSION, PDPA_POLICY_URL } from "./pdpa";
import type { EventPassEmailSender } from "./ports";
import { createRegistrations } from "./registrations";

const OCT_31 = "2026-10-31";
const NOV_01 = "2026-11-01";

/** Before the Event, so both Event Days are still open whatever today's date is. */
const registeredAt = new Date("2026-10-22T12:00:00+07:00");

describe("Registration module: detail and delete", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;

  before(async () => {
    database = await createTestDatabase();
  });

  beforeEach(async () => {
    await database.reset();
  });

  after(async () => {
    await database.drop();
  });

  /** The Registration module as it runs at `time`; every Event Pass email goes out. */
  function registrationsAt(time: Date) {
    return createRegistrations({
      db: database.db,
      clock: () => time,
      emailSender: sendsEverything,
      appUrl: "https://register.stemracing.example",
    });
  }

  /** Registers `changes` on top of a valid Attendee; returns their Event Pass and list row. */
  async function register(changes: Partial<RegistrationForm> = {}) {
    const registrations = registrationsAt(registeredAt);
    const result = await registrations.submit({ ...attendee, ...changes });
    if (result.status !== "accepted") assert.fail(`not accepted: ${JSON.stringify(result)}`);
    const { rows } = await registrations.search({ q: result.pass.passCode, page: 1, pageSize: 10 });
    assert.equal(rows.length, 1, `one row for ${result.pass.passCode}`);
    return { pass: result.pass, row: rows[0] };
  }

  /** Checks the Attendee in on `eventDay`, at `time`. */
  async function checkIn(passCode: string, eventDay: string, time: Date) {
    const result = await registrationsAt(time).checkIn({ scan: passCode, eventDay, staffAccountId: "staff-1" });
    assert.match(result.status, /^checked-in/, JSON.stringify(result));
  }

  test("the detail shows every answer, the Pass Code, the email status and the Check-Ins", async () => {
    const { pass, row } = await register({
      role: "other",
      roleOther: "ศิษย์เก่า",
      organisation: "โรงเรียนสาธิต",
      eventDays: [OCT_31],
      referralSources: ["line", "other"],
      referralOther: "ป้ายหน้างาน",
      competingTeamCheeredFor: "ทีมสายฟ้า",
      comments: "มากัน 2 คน",
    });
    const oct31Morning = new Date("2026-10-31T09:15:00+07:00");
    const nov01Noon = new Date("2026-11-01T12:30:00+07:00");
    await checkIn(pass.passCode, OCT_31, oct31Morning);
    await checkIn(pass.passCode, NOV_01, nov01Noon);

    const detail = await registrationsAt(nov01Noon).getRegistrationDetail(row.id);

    assert.deepEqual(detail, {
      status: "found",
      registration: {
        id: row.id,
        createdAt: row.createdAt,
        token: pass.token,
        passCode: pass.passCode,
        givenName: "วิชัย",
        familyName: "ใจดี",
        phone: "+66812345678",
        email: "wichai@example.com",
        role: "other",
        roleOther: "ศิษย์เก่า",
        organisation: "โรงเรียนสาธิต",
        eventDays: [OCT_31],
        referralSources: ["line", "other"],
        referralOther: "ป้ายหน้างาน",
        competingTeamCheeredFor: "ทีมสายฟ้า",
        accessibilityNeeds: null,
        comments: "มากัน 2 คน",
        pdpaAcknowledgedAt: registeredAt,
        pdpaNoticeVersion: PDPA_NOTICE_VERSION,
        pdpaPolicyUrl: PDPA_POLICY_URL,
        emailSentCount: 1,
        lastEmailSentAt: registeredAt,
        checkIns: [
          { eventDay: OCT_31, checkedInAt: oct31Morning, outsideRegisteredDay: false },
          { eventDay: NOV_01, checkedInAt: nov01Noon, outsideRegisteredDay: true },
        ],
      },
    });
  });

  test("a Registration from before the PDPA field has no acknowledgment record", async () => {
    const { row } = await register();
    await database.db
      .update(registrationsTable)
      .set({ pdpaAcknowledgedAt: null, pdpaNoticeVersion: null, pdpaPolicyUrl: null })
      .where(eq(registrationsTable.id, row.id));

    const result = await registrationsAt(registeredAt).getRegistrationDetail(row.id);
    assert.equal(result.status, "found");
    assert.equal(result.registration.pdpaAcknowledgedAt, null);
    assert.equal(result.registration.pdpaNoticeVersion, null);
    assert.equal(result.registration.pdpaPolicyUrl, null);
  });

  test("an answer to the retired help-needed question is still shown", async () => {
    const { row } = await register();
    await database.db
      .update(registrationsTable)
      .set({ accessibilityNeeds: "ใช้รถเข็น\nต้องการที่นั่งใกล้ทางเข้า" })
      .where(eq(registrationsTable.id, row.id));

    const result = await registrationsAt(registeredAt).getRegistrationDetail(row.id);
    assert.equal(result.status, "found");
    assert.equal(result.registration.accessibilityNeeds, "ใช้รถเข็น\nต้องการที่นั่งใกล้ทางเข้า");
  });

  test("an id with no Registration is not found", async () => {
    const { row } = await register();
    const registrations = registrationsAt(registeredAt);

    // Beyond Postgres' integer range, fractional and non-positive ids can't be Registrations either.
    for (const id of [row.id + 1, 0, -1, 1.5, Number.NaN, 2 ** 31]) {
      assert.deepEqual(await registrations.getRegistrationDetail(id), { status: "not-found" }, `id ${id}`);
    }
  });

  test("a deleted Registration disappears from search, counts and token lookup, and its Check-Ins go too", async () => {
    const spam = await register({ givenName: "สแปม", role: "student", eventDays: [OCT_31, NOV_01] });
    const kept = await register({ role: "parent", eventDays: [OCT_31] });
    const oct31Morning = new Date("2026-10-31T09:15:00+07:00");
    await checkIn(spam.pass.passCode, OCT_31, oct31Morning);
    await checkIn(kept.pass.passCode, OCT_31, oct31Morning);
    const registrations = registrationsAt(oct31Morning);

    const result = await registrations.deleteRegistration(spam.row.id);

    assert.deepEqual(result, { status: "deleted", passCode: spam.pass.passCode });
    const everyone = await registrations.search({ page: 1, pageSize: 10 });
    assert.deepEqual(everyone.rows.map((row) => row.passCode), [kept.pass.passCode]);
    assert.equal(everyone.total, 1);
    assert.equal((await registrations.search({ q: spam.pass.passCode, page: 1, pageSize: 10 })).total, 0);
    // The database stamps created_at with the real time, so today's count isn't fixed here.
    const { registeredToday, ...counts } = await registrations.headCounts();
    void registeredToday;
    assert.deepEqual(counts, {
      eventDays: [
        {
          eventDay: OCT_31,
          byRole: { parent: 1, teacher: 0, student: 0, sponsor: 0, other: 0 },
          total: 1,
          checkIns: { total: 1, outsideRegisteredDay: 0 },
        },
        {
          eventDay: NOV_01,
          byRole: { parent: 0, teacher: 0, student: 0, sponsor: 0, other: 0 },
          total: 0,
          checkIns: { total: 0, outsideRegisteredDay: 0 },
        },
      ],
      registrations: 1,
    });
    assert.deepEqual(await registrations.getEventPass(spam.pass.token), { status: "not-found" });
    assert.deepEqual(await registrations.getRegistrationDetail(spam.row.id), { status: "not-found" });
    // Its Check-In went with it; the other Attendee's stays.
    assert.equal(await database.db.$count(checkInsTable, eq(checkInsTable.registrationId, spam.row.id)), 0);
    const keptDetail = await registrations.getRegistrationDetail(kept.row.id);
    assert.equal(keptDetail.status === "found" && keptDetail.registration.checkIns.length, 1);
  });

  test("deleting an id with no Registration reports not found and deletes nothing", async () => {
    const kept = await register({ givenName: "วิภา" });
    const { row } = await register();
    const registrations = registrationsAt(registeredAt);
    assert.equal((await registrations.deleteRegistration(row.id)).status, "deleted");

    // Deleted already (say, by another Staff member), never existed, or can't be an id at all.
    for (const id of [row.id, row.id + 1, 0, -1, 1.5, Number.NaN, 2 ** 31]) {
      assert.deepEqual(await registrations.deleteRegistration(id), { status: "not-found" }, `id ${id}`);
    }
    const everyone = await registrations.search({ page: 1, pageSize: 10 });
    assert.deepEqual(everyone.rows.map(({ id }) => id), [kept.row.id]);
  });
});

const sendsEverything: EventPassEmailSender = {
  configured: true,
  async send() {
    return { success: true };
  },
};

const attendee: RegistrationForm = {
  givenName: "วิชัย",
  familyName: "ใจดี",
  phone: "081-234-5678",
  email: "wichai@example.com",
  role: "parent",
  roleOther: "",
  organisation: "",
  eventDays: [OCT_31],
  referralSources: ["facebook"],
  referralOther: "",
  competingTeamCheeredFor: "",
  comments: "",
  pdpaAcknowledged: true,
};
