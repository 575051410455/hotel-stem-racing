import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import { registrations as registrationsTable } from "@/lib/db/schema";
import { createTestDatabase } from "@/test-support/database";
import type { RegistrationForm } from "./fields";
import { createRegistrations } from "./registrations";

const OCT_31 = "2026-10-31";
const NOV_01 = "2026-11-01";

describe("Registration module: new Registrations per day", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let registrations: ReturnType<typeof createRegistrations>;
  /** What the injected clock reads; each test sets it. */
  let now: Date;

  before(async () => {
    database = await createTestDatabase();
    registrations = createRegistrations({ db: database.db, clock: () => now });
  });

  beforeEach(async () => {
    await database.reset();
    now = new Date("2026-10-25T12:00:00+07:00");
  });

  after(async () => {
    await database.drop();
  });

  let phoneSequence = 0;

  /**
   * Registers one more Attendee through `submit`, then stamps `created_at` with `createdAt`: the
   * database stamps it with its own time, so tests set it directly. A fresh phone keeps each
   * Registration distinct.
   */
  async function registerAt(createdAt: string, eventDays: string[] = [OCT_31]) {
    phoneSequence += 1;
    const result = await registrations.submit({
      ...attendee,
      phone: `08${String(phoneSequence).padStart(8, "0")}`,
      eventDays,
    });
    if (result.status !== "accepted") assert.fail(`not accepted: ${JSON.stringify(result)}`);
    await database.db
      .update(registrationsTable)
      .set({ createdAt: new Date(createdAt) })
      .where(eq(registrationsTable.token, result.pass.token));
  }

  test("is empty with no Registrations", async () => {
    assert.deepEqual(await registrations.newRegistrationsPerDay(), []);
  });

  test("counts Registrations created today", async () => {
    await registerAt("2026-10-25T09:00:00+07:00");
    await registerAt("2026-10-25T10:30:00+07:00");

    assert.deepEqual(await registrations.newRegistrationsPerDay(), [
      { date: "2026-10-25", registrations: 2 },
    ]);
  });

  test("starts on the day of the earliest Registration and ends today, per the clock", async () => {
    await registerAt("2026-10-23T08:00:00+07:00");
    await registerAt("2026-10-22T15:00:00+07:00");
    await registerAt("2026-10-23T20:00:00+07:00");

    assert.deepEqual(await registrations.newRegistrationsPerDay(), [
      { date: "2026-10-22", registrations: 1 },
      { date: "2026-10-23", registrations: 2 },
      { date: "2026-10-24", registrations: 0 },
      { date: "2026-10-25", registrations: 0 },
    ]);
  });

  test("shows days without Registrations between two days with some as zero", async () => {
    await registerAt("2026-10-20T10:00:00+07:00");
    await registerAt("2026-10-23T10:00:00+07:00");
    await registerAt("2026-10-25T10:00:00+07:00");

    assert.deepEqual(await registrations.newRegistrationsPerDay(), [
      { date: "2026-10-20", registrations: 1 },
      { date: "2026-10-21", registrations: 0 },
      { date: "2026-10-22", registrations: 0 },
      { date: "2026-10-23", registrations: 1 },
      { date: "2026-10-24", registrations: 0 },
      { date: "2026-10-25", registrations: 1 },
    ]);
  });

  test("a Registration for both Event Days counts once, on the day it was created", async () => {
    await registerAt("2026-10-24T10:00:00+07:00", [OCT_31, NOV_01]);
    await registerAt("2026-10-25T10:00:00+07:00", [NOV_01]);

    assert.deepEqual(await registrations.newRegistrationsPerDay(), [
      { date: "2026-10-24", registrations: 1 },
      { date: "2026-10-25", registrations: 1 },
    ]);
  });

  test("days are Bangkok calendar days, for Registrations and for today", async () => {
    // 23:59:59 and 00:00 Bangkok are 16:59:59 and 17:00 UTC, on the same UTC day.
    await registerAt("2026-10-22T16:59:59Z");
    await registerAt("2026-10-22T17:00:00Z");
    // Midnight of 25 October in Bangkok, still 24 October in UTC.
    now = new Date("2026-10-24T17:00:00Z");

    assert.deepEqual(await registrations.newRegistrationsPerDay(), [
      { date: "2026-10-22", registrations: 1 },
      { date: "2026-10-23", registrations: 1 },
      { date: "2026-10-24", registrations: 0 },
      { date: "2026-10-25", registrations: 0 },
    ]);

    // A second before Bangkok midnight, the series still ends on 24 October.
    now = new Date("2026-10-24T16:59:59Z");
    assert.deepEqual((await registrations.newRegistrationsPerDay()).at(-1), {
      date: "2026-10-24",
      registrations: 0,
    });
  });

  test("never drops a Registration stamped on a later day than the clock's", async () => {
    // The database stamps `created_at` with its own time, which can be just past midnight while
    // the clock still reads the day before.
    now = new Date("2026-10-25T23:59:59+07:00");
    await registerAt("2026-10-24T10:00:00+07:00");
    await registerAt("2026-10-26T00:00:01+07:00");

    assert.deepEqual(await registrations.newRegistrationsPerDay(), [
      { date: "2026-10-24", registrations: 1 },
      { date: "2026-10-25", registrations: 0 },
      { date: "2026-10-26", registrations: 1 },
    ]);
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
