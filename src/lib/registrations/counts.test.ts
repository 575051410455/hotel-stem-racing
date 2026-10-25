import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import { registrations as registrationsTable } from "@/lib/db/schema";
import { createTestDatabase } from "@/test-support/database";
import type { AttendeeRole, RegistrationForm } from "./fields";
import { createRegistrations, type EventPass } from "./registrations";

const OCT_31 = "2026-10-31";
const NOV_01 = "2026-11-01";

/** Before the Event, so both Event Days are still open whatever today's date is. */
const BEFORE_THE_EVENT = "2026-10-22T12:00:00";

const noCheckIns = { total: 0, outsideRegisteredDay: 0 };

describe("head counts: per Event Day by Attendee Role, Check-Ins and today's Registrations", () => {
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

  /** The Registration module with its clock fixed at a Bangkok wall-clock time. */
  const at = (bangkokWallClock: string) =>
    createRegistrations({ db: database.db, clock: () => new Date(`${bangkokWallClock}+07:00`) });

  let phoneSequence = 0;

  /**
   * Registers one more Attendee through `submit`; a fresh phone keeps each one distinct. The
   * database stamps `created_at`, so it is then set to `createdAt` (Bangkok wall-clock time).
   */
  async function register(
    role: AttendeeRole,
    eventDays: string[],
    createdAt = BEFORE_THE_EVENT,
  ): Promise<EventPass> {
    phoneSequence += 1;
    const result = await at(BEFORE_THE_EVENT).submit({
      ...attendee,
      phone: `08${String(phoneSequence).padStart(8, "0")}`,
      role,
      roleOther: role === "other" ? "ศิษย์เก่า" : "",
      organisation: role === "sponsor" ? "บริษัท ตัวอย่าง จำกัด" : "",
      eventDays,
    });
    if (result.status !== "accepted") assert.fail(`not accepted: ${JSON.stringify(result)}`);
    await database.db
      .update(registrationsTable)
      .set({ createdAt: new Date(`${createdAt}+07:00`) })
      .where(eq(registrationsTable.passCode, result.pass.passCode));
    return result.pass;
  }

  test("counts each Event Day by Attendee Role, with mixed roles across both days", async () => {
    await register("parent", [OCT_31]);
    await register("parent", [OCT_31]);
    await register("teacher", [OCT_31]);
    await register("sponsor", [OCT_31]);
    await register("student", [NOV_01]);
    await register("student", [NOV_01]);
    await register("student", [NOV_01]);
    await register("other", [NOV_01]);

    assert.deepEqual(await at(BEFORE_THE_EVENT).headCounts(), {
      eventDays: [
        { eventDay: OCT_31, byRole: { parent: 2, teacher: 1, student: 0, sponsor: 1, other: 0 }, total: 4, checkIns: noCheckIns },
        { eventDay: NOV_01, byRole: { parent: 0, teacher: 0, student: 3, sponsor: 0, other: 1 }, total: 4, checkIns: noCheckIns },
      ],
      registrations: 8,
      registeredToday: 8,
    });
  });

  test("a Registration for both Event Days counts on each day, and once among all Registrations", async () => {
    await register("parent", [OCT_31, NOV_01]);
    await register("teacher", [NOV_01]);

    assert.deepEqual(await at(BEFORE_THE_EVENT).headCounts(), {
      eventDays: [
        { eventDay: OCT_31, byRole: { parent: 1, teacher: 0, student: 0, sponsor: 0, other: 0 }, total: 1, checkIns: noCheckIns },
        { eventDay: NOV_01, byRole: { parent: 1, teacher: 1, student: 0, sponsor: 0, other: 0 }, total: 2, checkIns: noCheckIns },
      ],
      registrations: 2,
      registeredToday: 2,
    });
  });

  test("counts drop when a Registration is removed", async () => {
    await register("student", [OCT_31]);
    const removed = await register("student", [OCT_31, NOV_01]);
    await register("sponsor", [NOV_01]);
    const registrations = at(BEFORE_THE_EVENT);

    const { rows } = await registrations.search({ q: removed.passCode, page: 1, pageSize: 10 });
    assert.equal((await registrations.deleteRegistration(rows[0].id)).status, "deleted");

    assert.deepEqual(await registrations.headCounts(), {
      eventDays: [
        { eventDay: OCT_31, byRole: { parent: 0, teacher: 0, student: 1, sponsor: 0, other: 0 }, total: 1, checkIns: noCheckIns },
        { eventDay: NOV_01, byRole: { parent: 0, teacher: 0, student: 0, sponsor: 1, other: 0 }, total: 1, checkIns: noCheckIns },
      ],
      registrations: 2,
      registeredToday: 2,
    });
  });

  test("with no Registrations, every Event Day lists every Attendee Role at zero", async () => {
    assert.deepEqual(await at(BEFORE_THE_EVENT).headCounts(), {
      eventDays: [
        { eventDay: OCT_31, byRole: { parent: 0, teacher: 0, student: 0, sponsor: 0, other: 0 }, total: 0, checkIns: noCheckIns },
        { eventDay: NOV_01, byRole: { parent: 0, teacher: 0, student: 0, sponsor: 0, other: 0 }, total: 0, checkIns: noCheckIns },
      ],
      registrations: 0,
      registeredToday: 0,
    });
  });

  test("registered today counts the Registrations created on the clock's Bangkok calendar day", async () => {
    await register("parent", [OCT_31], "2026-10-22T23:59:59");
    await register("teacher", [OCT_31], "2026-10-23T00:00:00");
    await register("student", [NOV_01], "2026-10-23T06:00:00");
    await register("sponsor", [NOV_01], "2026-10-24T00:00:00");

    // 06:30 in Bangkok is still 22 October in UTC.
    const counts = await at("2026-10-23T06:30:00").headCounts();

    assert.equal(counts.registeredToday, 2);
    assert.equal(counts.registrations, 4);
  });

  /** Checks the Attendee in on `eventDay`, as Staff at the entrance would that morning. */
  async function checkIn(pass: EventPass, eventDay: string) {
    const result = await at(`${eventDay}T09:00:00`).checkIn({
      scan: pass.passCode,
      eventDay,
      staffAccountId: "staff-account-1",
    });
    assert.match(result.status, /^checked-in/, JSON.stringify(result));
  }

  test("Check-Ins count per Event Day, and one outside the registered day counts in both numbers", async () => {
    const bothDays = await register("parent", [OCT_31, NOV_01]);
    const oct31Only = await register("student", [OCT_31]);
    const nov01Only = await register("teacher", [NOV_01]);
    await register("sponsor", [OCT_31]);
    await checkIn(bothDays, OCT_31);
    await checkIn(oct31Only, OCT_31);
    await checkIn(nov01Only, OCT_31);
    await checkIn(bothDays, NOV_01);

    const counts = await at("2026-11-01T10:00:00").headCounts();

    assert.deepEqual(
      counts.eventDays.map(({ eventDay, checkIns }) => ({ eventDay, checkIns })),
      [
        { eventDay: OCT_31, checkIns: { total: 3, outsideRegisteredDay: 1 } },
        { eventDay: NOV_01, checkIns: { total: 1, outsideRegisteredDay: 0 } },
      ],
    );
  });

  test("a deleted Registration's Check-Ins drop out of the counts", async () => {
    const spam = await register("student", [NOV_01]);
    const kept = await register("parent", [OCT_31]);
    await checkIn(spam, OCT_31);
    await checkIn(kept, OCT_31);
    await checkIn(spam, NOV_01);
    const registrations = at("2026-11-01T10:00:00");

    const { rows } = await registrations.search({ q: spam.passCode, page: 1, pageSize: 10 });
    assert.equal((await registrations.deleteRegistration(rows[0].id)).status, "deleted");

    const counts = await registrations.headCounts();
    assert.deepEqual(
      counts.eventDays.map(({ eventDay, checkIns }) => ({ eventDay, checkIns })),
      [
        { eventDay: OCT_31, checkIns: { total: 1, outsideRegisteredDay: 0 } },
        { eventDay: NOV_01, checkIns: noCheckIns },
      ],
    );
  });
});

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
