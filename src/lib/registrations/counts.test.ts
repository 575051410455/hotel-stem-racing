import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { createTestDatabase } from "@/test-support/database";
import type { AttendeeRole, RegistrationForm } from "./fields";
import { createRegistrations, type EventPass } from "./registrations";

const OCT_31 = "2026-10-31";
const NOV_01 = "2026-11-01";

/** Before the Event, so both Event Days are still open whatever today's date is. */
const beforeTheEvent = () => new Date("2026-10-22T12:00:00+07:00");

describe("counts per Event Day by Attendee Role", () => {
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

  let phoneSequence = 0;

  /** Registers one more Attendee through `submit`; a fresh phone keeps each one distinct. */
  async function register(role: AttendeeRole, eventDays: string[]): Promise<EventPass> {
    phoneSequence += 1;
    const result = await registrations.submit({
      ...attendee,
      phone: `08${String(phoneSequence).padStart(8, "0")}`,
      role,
      roleOther: role === "other" ? "ศิษย์เก่า" : "",
      organisation: role === "sponsor" ? "บริษัท ตัวอย่าง จำกัด" : "",
      eventDays,
    });
    if (result.status !== "accepted") assert.fail(`not accepted: ${JSON.stringify(result)}`);
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

    assert.deepEqual(await registrations.countByEventDayAndRole(), {
      eventDays: [
        { eventDay: OCT_31, byRole: { parent: 2, teacher: 1, student: 0, sponsor: 1, other: 0 }, total: 4 },
        { eventDay: NOV_01, byRole: { parent: 0, teacher: 0, student: 3, sponsor: 0, other: 1 }, total: 4 },
      ],
      registrations: 8,
    });
  });

  test("a Registration for both Event Days counts on each day, and once among all Registrations", async () => {
    await register("parent", [OCT_31, NOV_01]);
    await register("teacher", [NOV_01]);

    assert.deepEqual(await registrations.countByEventDayAndRole(), {
      eventDays: [
        { eventDay: OCT_31, byRole: { parent: 1, teacher: 0, student: 0, sponsor: 0, other: 0 }, total: 1 },
        { eventDay: NOV_01, byRole: { parent: 1, teacher: 1, student: 0, sponsor: 0, other: 0 }, total: 2 },
      ],
      registrations: 2,
    });
  });

  test("counts drop when a Registration is removed", async () => {
    await register("student", [OCT_31]);
    const removed = await register("student", [OCT_31, NOV_01]);
    await register("sponsor", [NOV_01]);

    const { rows } = await registrations.search({ q: removed.passCode, page: 1, pageSize: 10 });
    assert.equal((await registrations.deleteRegistration(rows[0].id)).status, "deleted");

    assert.deepEqual(await registrations.countByEventDayAndRole(), {
      eventDays: [
        { eventDay: OCT_31, byRole: { parent: 0, teacher: 0, student: 1, sponsor: 0, other: 0 }, total: 1 },
        { eventDay: NOV_01, byRole: { parent: 0, teacher: 0, student: 0, sponsor: 1, other: 0 }, total: 1 },
      ],
      registrations: 2,
    });
  });

  test("with no Registrations, every Event Day lists every Attendee Role at zero", async () => {
    assert.deepEqual(await registrations.countByEventDayAndRole(), {
      eventDays: [
        { eventDay: OCT_31, byRole: { parent: 0, teacher: 0, student: 0, sponsor: 0, other: 0 }, total: 0 },
        { eventDay: NOV_01, byRole: { parent: 0, teacher: 0, student: 0, sponsor: 0, other: 0 }, total: 0 },
      ],
      registrations: 0,
    });
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
  accessibilityNeeds: "",
  comments: "",
};
