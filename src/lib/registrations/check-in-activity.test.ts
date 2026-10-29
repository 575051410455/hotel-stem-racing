import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { createTestDatabase } from "@/test-support/database";
import { users } from "@/lib/db/auth-schema";
import type { RegistrationForm } from "./fields";
import { createRegistrations } from "./registrations";

const FIRST_DAY = "2026-10-31";
const SECOND_DAY = "2026-11-01";
const attendee: RegistrationForm = {
  givenName: "Alice",
  familyName: "Smith",
  phone: "0812345678",
  email: "alice@example.com",
  role: "parent",
  roleOther: "",
  organisation: "Richmond School",
  eventDays: [FIRST_DAY, SECOND_DAY],
  referralSources: ["facebook"],
  referralOther: "",
  competingTeamCheeredFor: "",
  comments: "",
  pdpaAcknowledged: true,
};

describe("Registration module: Check-In Activity", () => {
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
  const at = (time = "2026-10-29T10:00:00+07:00") =>
    createRegistrations({ db: database.db, clock: () => new Date(time) });
  async function register(changes: Partial<RegistrationForm> = {}) {
    const result = await at().submit({ ...attendee, ...changes });
    assert.equal(result.status, "accepted");
    return result.pass;
  }

  test("lists recorded Check-Ins by Event Day, with newest first and safe missing Account attribution", async () => {
    const pass = await register();
    // A rehearsal can record an Event Day before that calendar date.
    await at().checkIn({
      scan: pass.passCode,
      eventDay: FIRST_DAY,
      staffAccountId: "legacy-account",
    });
    await at("2026-10-29T11:00:00+07:00").checkIn({
      scan: pass.passCode,
      eventDay: SECOND_DAY,
      staffAccountId: "legacy-account",
    });
    const result = await at().checkInActivity({
      day: FIRST_DAY,
      page: 1,
      pageSize: 25,
    });
    assert.equal(result.total, 1);
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].givenName, "Alice");
    assert.equal(result.rows[0].passCode, pass.passCode);
    assert.equal(result.rows[0].organisation, "Richmond School");
    assert.equal(
      result.rows[0].checkedInAt.toISOString(),
      "2026-10-29T03:00:00.000Z",
    );
    assert.equal(result.rows[0].accountName, null);
    assert.equal("token" in result.rows[0], false);
    assert.equal("email" in result.rows[0], false);
  });

  test("overview separates expected arrivals from outside-day arrivals, ignores repeats and follows deletion", async () => {
    const alice = await register();
    await register({ givenName: "Bob", eventDays: [FIRST_DAY] });
    await register({ givenName: "Cara", eventDays: [FIRST_DAY] });
    const dana = await register({ givenName: "Dana", eventDays: [SECOND_DAY] });
    for (const pass of [alice, alice, dana]) {
      await at().checkIn({
        scan: pass.passCode,
        eventDay: FIRST_DAY,
        staffAccountId: "desk",
      });
    }
    await at().checkIn({
      scan: alice.passCode,
      eventDay: SECOND_DAY,
      staffAccountId: "desk",
    });
    const view = { day: FIRST_DAY, page: 1, pageSize: 25 };
    assert.deepEqual((await at().checkInActivity(view)).summary, {
      registered: 3,
      checkedInRegistered: 1,
      awaiting: 2,
      outside: 1,
      total: 2,
    });
    assert.deepEqual(
      (await at().checkInActivity({ ...view, day: SECOND_DAY })).summary,
      {
        registered: 2,
        checkedInRegistered: 1,
        awaiting: 1,
        outside: 0,
        total: 1,
      },
    );
    const found = await at().search({
      q: alice.passCode,
      page: 1,
      pageSize: 25,
    });
    await at().deleteRegistration(found.rows[0].id);
    assert.deepEqual((await at().checkInActivity(view)).summary, {
      registered: 2,
      checkedInRegistered: 0,
      awaiting: 2,
      outside: 1,
      total: 1,
    });
  });

  test("search matches names, normalised Pass Codes and organisation without narrowing the overview", async () => {
    const alice = await register();
    const thai = await register({
      givenName: "วิชัย",
      familyName: "ใจดี",
      organisation: "โรงเรียนตัวอย่าง",
    });
    for (const pass of [alice, thai]) {
      await at().checkIn({
        scan: pass.passCode,
        eventDay: FIRST_DAY,
        staffAccountId: "desk",
      });
    }
    for (const q of [
      "aLiCe   sMiTh",
      "RICHMOND",
      alice.passCode.slice(3).toLowerCase(),
    ]) {
      const found = await at().checkInActivity({
        day: FIRST_DAY,
        q,
        page: 1,
        pageSize: 25,
      });
      assert.equal(found.total, 1, q);
      assert.equal(found.rows[0].givenName, "Alice", q);
      assert.equal(found.summary.total, 2);
    }
    assert.equal(
      (
        await at().checkInActivity({
          day: FIRST_DAY,
          q: "ใจดี",
          page: 1,
          pageSize: 25,
        })
      ).total,
      1,
    );
    assert.equal(
      (
        await at().checkInActivity({
          day: FIRST_DAY,
          q: "%_",
          page: 1,
          pageSize: 25,
        })
      ).total,
      0,
    );
  });

  test("filters combine by role, recording Account and outside day, including disabled recording Accounts", async () => {
    await database.db.insert(users).values([
      {
        id: "desk",
        name: "Desk Staff",
        email: "desk@example.com",
        kind: "staff",
        disabledAt: new Date(),
      },
      {
        id: "kiosk",
        name: "Kiosk 1",
        email: "kiosk@example.com",
        kind: "kiosk",
      },
    ]);
    const alice = await register();
    const bob = await register({
      givenName: "Bob",
      role: "teacher",
      eventDays: [FIRST_DAY],
    });
    const cara = await register({
      givenName: "Cara",
      role: "student",
      eventDays: [SECOND_DAY],
    });
    for (const [pass, account] of [
      [alice, "desk"],
      [bob, "kiosk"],
      [cara, "desk"],
    ] as const) {
      await at().checkIn({
        scan: pass.passCode,
        eventDay: FIRST_DAY,
        staffAccountId: account,
      });
    }
    const view = { day: FIRST_DAY, page: 1, pageSize: 25 };
    const result = await at().checkInActivity({
      ...view,
      role: "parent",
      account: "desk",
      outside: false,
      q: "ALICE",
    });
    assert.equal(result.total, 1);
    assert.equal(result.rows[0].accountName, "Desk Staff");
    assert.equal(result.summary.total, 3);
    assert.deepEqual(result.accounts, [
      { id: "desk", name: "Desk Staff" },
      { id: "kiosk", name: "Kiosk 1" },
    ]);
    assert.equal(
      (await at().checkInActivity({ ...view, account: "desk" })).total,
      2,
    );
    assert.equal(
      (await at().checkInActivity({ ...view, role: "teacher" })).total,
      1,
    );
    assert.equal(
      (await at().checkInActivity({ ...view, outside: true })).rows[0]
        .givenName,
      "Cara",
    );
    assert.equal(
      (await at().checkInActivity({ ...view, outside: false })).total,
      2,
    );
  });

  test("equal-time Check-Ins have stable server pagination and reading preserves existing Event Passes", async () => {
    let originalPass: Awaited<ReturnType<typeof register>> | undefined;
    for (let index = 0; index < 27; index += 1) {
      const pass = await register({
        givenName: `Attendee ${"A".repeat(index + 1)}`,
      });
      originalPass ??= pass;
      await at().checkIn({
        scan: pass.passCode,
        eventDay: FIRST_DAY,
        staffAccountId: "legacy",
      });
    }
    const first = await at().checkInActivity({
      day: FIRST_DAY,
      page: 1,
      pageSize: 25,
    });
    const second = await at().checkInActivity({
      day: FIRST_DAY,
      page: 2,
      pageSize: 25,
    });
    assert.equal(first.total, 27);
    assert.equal(first.rows.length, 25);
    assert.equal(second.rows.length, 2);
    assert.equal(
      first.rows[0].givenName,
      "Attendee AAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );
    assert.equal(second.rows[1].givenName, "Attendee A");
    assert.equal(
      new Set([...first.rows, ...second.rows].map((row) => row.id)).size,
      27,
    );
    assert.ok(originalPass);
    assert.deepEqual(await at().getEventPass(originalPass.token), {
      status: "found",
      pass: originalPass,
    });
    const repeated = await at().checkIn({
      scan: originalPass.passCode,
      eventDay: FIRST_DAY,
      staffAccountId: "another",
    });
    assert.equal(repeated.status, "already-checked-in");
    assert.equal(
      (await at().checkInActivity({ day: FIRST_DAY, page: 3, pageSize: 25 }))
        .rows.length,
      0,
    );
    assert.equal(
      (await at().checkInActivity({ day: SECOND_DAY, page: 1, pageSize: 25 }))
        .summary.total,
      0,
    );
  });
});
