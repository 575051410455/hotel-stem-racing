import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { createTestDatabase } from "@/test-support/database";
import { emptyRegistrationForm } from "./fields";
import { createRegistrations } from "./registrations";

describe("Inspecting an Event Pass before Staff confirmation", () => {
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

  const at = (time = "2026-10-31T09:00:00+07:00") =>
    createRegistrations({ db: database.db, clock: () => new Date(time) });

  async function register() {
    const result = await createRegistrations({
      db: database.db,
      clock: () => new Date("2026-10-27T09:00:00+07:00"),
      generatePassCode: () => "EP-7KQ2MZ9H",
    }).submit({
      ...emptyRegistrationForm,
      givenName: "Somchai",
      familyName: "Jaidee",
      phone: "0812345678",
      email: "attendee@example.org",
      role: "parent",
      eventDays: ["2026-10-31"],
      referralSources: ["website"],
      pdpaAcknowledged: true,
    });
    assert.equal(result.status, "accepted");
    const { rows } = await at().search({ page: 1, pageSize: 10 });
    return { pass: result.pass, id: rows[0].id };
  }

  test("repeated inspection shows the Attendee and reviewed day without recording arrival", async () => {
    const { id } = await register();
    const registrations = at();
    for (let repeat = 0; repeat < 2; repeat++) {
      const preview = await registrations.inspectCheckIn({ scan: "ep 7kq2 mz9h" });
      assert.equal(preview.status, "ready");
      if (preview.status !== "ready") return;
      assert.equal(preview.eventDay, "2026-10-31");
      assert.equal(preview.attendee.givenName, "Somchai");
      assert.equal(preview.outsideRegisteredDay, false);
    }
    const detail = await registrations.getRegistrationDetail(id);
    assert.equal(detail.status, "found");
    if (detail.status === "found") assert.deepEqual(detail.registration.checkIns, []);
  });

  test("two previews can confirm once, and a retry or later inspection reports the original Check-In", async () => {
    const { pass, id } = await register();
    const registrations = at();
    const previews = await Promise.all([
      registrations.inspectCheckIn({ scan: pass.token }),
      registrations.inspectCheckIn({ scan: `https://old.example.org/p/${pass.token}` }),
    ]);
    assert.deepEqual(
      previews.map((preview) => preview.status),
      ["ready", "ready"],
    );
    const outcomes = await Promise.all(
      ["staff-one", "staff-two"].map((staffAccountId) =>
        registrations.checkIn({ scan: pass.token, eventDay: "2026-10-31", staffAccountId }),
      ),
    );
    assert.deepEqual(outcomes.map((outcome) => outcome.status).sort(), ["already-checked-in", "checked-in"]);
    const retried = await at("2026-10-31T10:00:00+07:00").checkIn({
      scan: pass.passCode,
      eventDay: "2026-10-31",
      staffAccountId: "staff-one",
    });
    assert.equal(retried.status, "already-checked-in");
    const inspected = await registrations.inspectCheckIn({ scan: pass.passCode });
    assert.equal(inspected.status, "already-checked-in");
    if (inspected.status === "already-checked-in")
      assert.deepEqual(inspected.checkedInAt, new Date("2026-10-31T09:00:00+07:00"));
    const detail = await registrations.getRegistrationDetail(id);
    if (detail.status !== "found") assert.fail("The Registration must still exist");
    assert.equal(detail.registration.checkIns.length, 1);
  });

  test("inspection resolves codes, tokens and old links and returns no contact or broader Registration data", async () => {
    const { pass } = await register();
    for (const scan of [pass.passCode, pass.token, `https://old.example.org/p/${pass.token}`]) {
      assert.deepEqual(await at().inspectCheckIn({ scan }), {
        status: "ready",
        eventDay: "2026-10-31",
        outsideRegisteredDay: false,
        attendee: {
          givenName: "Somchai",
          familyName: "Jaidee",
          role: "parent",
          passCode: pass.passCode,
          eventDays: ["2026-10-31"],
        },
      });
    }
  });

  test("wrong-day inspection warns without writing and confirmation can record the reviewed day", async () => {
    const { pass, id } = await register();
    const preview = await at().inspectCheckIn({ scan: pass.token, eventDay: "2026-11-01" });
    assert.equal(preview.status, "ready");
    if (preview.status !== "ready") assert.fail("Expected a preview");
    assert.equal(preview.outsideRegisteredDay, true);
    const before = await at().getRegistrationDetail(id);
    if (before.status === "found") assert.deepEqual(before.registration.checkIns, []);
    const result = await at("2026-11-01T10:00:00+07:00").checkIn({
      scan: pass.token,
      eventDay: preview.eventDay,
      staffAccountId: "staff-one",
    });
    assert.equal(result.status, "checked-in-outside-registered-day");
  });

  test("clock changes do not move confirmation away from the day Staff reviewed", async () => {
    const { pass } = await register();
    const preview = await at("2026-10-31T23:59:59+07:00").inspectCheckIn({ scan: pass.token });
    if (preview.status !== "ready") assert.fail("Expected a preview");
    const result = await at("2026-11-01T00:00:01+07:00").checkIn({
      scan: pass.token,
      eventDay: preview.eventDay,
      staffAccountId: "staff-one",
    });
    assert.equal(result.status, "checked-in");
    if ("eventDay" in result) assert.equal(result.eventDay, "2026-10-31");
  });

  test("invalid days or passes do not write, and a pass deleted after preview cannot be confirmed", async () => {
    const { pass, id } = await register();
    assert.deepEqual(await at("2026-10-27T09:00:00+07:00").inspectCheckIn({ scan: pass.token }), {
      status: "not-an-event-day",
    });
    assert.deepEqual(await at().inspectCheckIn({ scan: pass.token, eventDay: "2026-12-01" }), {
      status: "not-an-event-day",
    });
    assert.deepEqual(await at().inspectCheckIn({ scan: "not a pass" }), { status: "not-an-event-pass" });
    assert.deepEqual(await at().inspectCheckIn({ scan: "EP-ABCDEFGH" }), { status: "not-an-event-pass" });
    assert.equal((await at().inspectCheckIn({ scan: pass.token })).status, "ready");
    await at().deleteRegistration(id);
    assert.deepEqual(
      await at().checkIn({ scan: pass.token, eventDay: "2026-10-31", staffAccountId: "staff-one" }),
      { status: "not-an-event-pass" },
    );
  });
});
