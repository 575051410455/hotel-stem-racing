import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { registrations as registrationsTable } from "@/lib/db/schema";
import { createTestDatabase } from "@/test-support/database";
import type { RegistrationForm } from "./fields";
import type { EventPassEmailSender, EventPassMessage, SendResult } from "./ports";
import { createRegistrations } from "./registrations";

const TEN_MINUTES = 10 * 60 * 1000;
const appUrl = "https://register.example.com/";
// Registration is open (the last Event Day ends 2026-11-01, Bangkok time) at every clock used here.
const beforeTheEvent = () => new Date("2026-10-22T12:00:00+07:00");

/** A Latin name, so case-folding is visible. */
const attendee: RegistrationForm = {
  givenName: "John",
  familyName: "Smith",
  phone: "081-234-5678",
  email: "john.smith@gmail.com",
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

describe("Duplicate Registration", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let registrations: ReturnType<typeof createRegistrations>;

  const registrationCount = () => database.db.$count(registrationsTable);
  const emailStatus = async () => {
    const [row] = await database.db
      .select({
        emailSentCount: registrationsTable.emailSentCount,
        lastEmailSentAt: registrationsTable.lastEmailSentAt,
      })
      .from(registrationsTable);
    return row;
  };

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

  test("a repeat submission for the same person returns the masked email and no Event Pass", async () => {
    const original = await registrations.submit(attendee);
    assert.equal(original.status, "accepted");

    const repeat = await registrations.submit({
      ...attendee,
      givenName: "  JOHN ",
      familyName: "smith",
      phone: "+66 81 234 5678",
    });

    assert.deepEqual(repeat, {
      status: "duplicate",
      maskedEmail: "j***@gmail.com",
      passResent: false,
      emailConfigured: false,
    });
    const shown = JSON.stringify(repeat);
    assert.ok(!shown.includes(original.pass.token), "the token is never returned");
    assert.ok(!shown.includes(original.pass.passCode), "the Pass Code is never returned");
    assert.equal(await registrationCount(), 1);
  });

  test("family members sharing an email or phone register separately", async () => {
    const results = [
      await registrations.submit(attendee),
      await registrations.submit({ ...attendee, givenName: "Jane" }),
      await registrations.submit({ ...attendee, familyName: "Smith-Jones" }),
      await registrations.submit({ ...attendee, phone: "089-876-5432" }),
    ];

    assert.deepEqual(
      results.map((result) => result.status),
      ["accepted", "accepted", "accepted", "accepted"],
    );
    assert.equal(await registrationCount(), 4);
  });

  test("two identical submissions racing each other make exactly one Registration", async () => {
    const results = await Promise.all([registrations.submit(attendee), registrations.submit(attendee)]);

    assert.deepEqual(results.map((result) => result.status).sort(), ["accepted", "duplicate"]);
    assert.equal(await registrationCount(), 1);
  });

  describe("re-sending the Event Pass", () => {
    const firstRepeatAt = new Date("2026-10-25T03:00:00.000Z");
    let now: Date;
    const clock = () => now;
    // Someone repeating the form with another address still can't redirect the pass to it.
    const repeat = { ...attendee, email: "someone.else@example.com" };

    beforeEach(() => {
      now = firstRepeatAt;
    });

    /** Registers with email off, so no first Event Pass email starts the 10-minute window. */
    async function registerAttendee() {
      const result = await registrations.submit(attendee);
      assert.equal(result.status, "accepted");
      return result.pass;
    }

    test("re-sends the existing Event Pass to the registered email at most once per 10 minutes", async () => {
      const pass = await registerAttendee();
      const email = fakeEmailSender();
      const withEmail = createRegistrations({ db: database.db, emailSender: email, clock, appUrl });

      assert.deepEqual(await withEmail.submit(repeat), {
        status: "duplicate",
        maskedEmail: "j***@gmail.com",
        passResent: true,
        emailConfigured: true,
      });
      assert.deepEqual(email.sent, [
        { to: "john.smith@gmail.com", passLink: `https://register.example.com/p/${pass.token}`, pass },
      ]);

      now = new Date(firstRepeatAt.getTime() + TEN_MINUTES - 1);
      const throttled = await withEmail.submit(repeat);
      assert.equal(throttled.status === "duplicate" && throttled.passResent, false);
      assert.equal(email.sent.length, 1);

      now = new Date(firstRepeatAt.getTime() + TEN_MINUTES);
      const allowed = await withEmail.submit(repeat);
      assert.equal(allowed.status === "duplicate" && allowed.passResent, true);
      assert.equal(email.sent.length, 2);

      // What Staff will see as the Registration's email status.
      assert.deepEqual(await emailStatus(), { emailSentCount: 2, lastEmailSentAt: now });
      assert.equal(await registrationCount(), 1);
    });

    test("the Event Pass email sent on registering also starts the 10-minute window", async () => {
      const email = fakeEmailSender();
      const withEmail = createRegistrations({ db: database.db, emailSender: email, clock, appUrl });
      await withEmail.submit(attendee);
      assert.equal(email.sent.length, 1);

      now = new Date(firstRepeatAt.getTime() + 5 * 60 * 1000);
      assert.deepEqual(await withEmail.submit(repeat), {
        status: "duplicate",
        maskedEmail: "j***@gmail.com",
        passResent: false,
        emailConfigured: true,
      });
      assert.equal(email.sent.length, 1);

      now = new Date(firstRepeatAt.getTime() + TEN_MINUTES);
      const allowed = await withEmail.submit(repeat);
      assert.equal(allowed.status === "duplicate" && allowed.passResent, true);
      assert.equal(email.sent.length, 2);
    });

    test("with email not configured, nothing is sent", async () => {
      await registerAttendee();
      const email = fakeEmailSender({ configured: false });
      const emailOff = createRegistrations({ db: database.db, emailSender: email, clock, appUrl });

      assert.deepEqual(await emailOff.submit(repeat), {
        status: "duplicate",
        maskedEmail: "j***@gmail.com",
        passResent: false,
        emailConfigured: false,
      });
      assert.deepEqual(email.sent, []);
      assert.deepEqual(await emailStatus(), { emailSentCount: 0, lastEmailSentAt: null });
    });

    test("a failed re-send is reported, recorded as unsent and can be retried straight away", async () => {
      await registerAttendee();
      const failing = fakeEmailSender({ result: { success: false, error: "ESOCKET: connect ECONNREFUSED" } });
      const working = fakeEmailSender();

      const failed = await createRegistrations({ db: database.db, emailSender: failing, clock, appUrl }).submit(
        repeat,
      );
      assert.deepEqual(failed, {
        status: "duplicate",
        maskedEmail: "j***@gmail.com",
        passResent: false,
        emailConfigured: true,
      });
      assert.deepEqual(await emailStatus(), { emailSentCount: 0, lastEmailSentAt: null });

      // Without a domain no link can be built; that is a failed send too, never an error page.
      const noDomain = createRegistrations({ db: database.db, emailSender: working, clock, appUrl: "" });
      const unbuildable = await noDomain.submit(repeat);
      assert.equal(unbuildable.status === "duplicate" && unbuildable.passResent, false);

      const retried = await createRegistrations({ db: database.db, emailSender: working, clock, appUrl }).submit(
        repeat,
      );
      assert.equal(retried.status === "duplicate" && retried.passResent, true);
      assert.equal(working.sent.length, 1);
    });

    test("repeat submissions racing each other re-send the Event Pass only once", async () => {
      await registerAttendee();
      const email = fakeEmailSender({ delayMs: 50 });
      const withEmail = createRegistrations({ db: database.db, emailSender: email, clock, appUrl });

      const results = await Promise.all([withEmail.submit(repeat), withEmail.submit(repeat), withEmail.submit(repeat)]);

      assert.deepEqual(
        results.map((result) => result.status === "duplicate" && result.passResent).sort(),
        [false, false, true],
      );
      assert.equal(email.sent.length, 1);
      assert.deepEqual(await emailStatus(), { emailSentCount: 1, lastEmailSentAt: firstRepeatAt });
    });
  });
});

/** Records every message; `configured`, the result and how long a send takes are set per test. */
function fakeEmailSender({
  configured = true,
  result = { success: true },
  delayMs = 0,
}: { configured?: boolean; result?: SendResult; delayMs?: number } = {}): EventPassEmailSender & {
  sent: EventPassMessage[];
} {
  const sent: EventPassMessage[] = [];
  return {
    configured,
    sent,
    async send(message) {
      sent.push(message);
      if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
      return result;
    },
  };
}
