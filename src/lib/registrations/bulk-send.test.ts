import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { createTestDatabase } from "@/test-support/database";
import type { RegistrationForm } from "./fields";
import type { EventPassEmailSender, EventPassMessage } from "./ports";
import { createRegistrations, type EventPass } from "./registrations";

const OCT_31 = "2026-10-31";
const NOV_01 = "2026-11-01";

/** Before the Event, so Registration is open and both Event Days can be chosen. */
const START = new Date("2026-10-22T12:00:00+07:00");
const APP_URL = "https://register.stemracing.example";

describe("bulk send of Event Pass emails", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;

  before(async () => {
    database = await createTestDatabase();
  });

  beforeEach(async () => {
    await database.reset();
    phoneSequence = 0;
  });

  after(async () => {
    await database.drop();
  });

  let phoneSequence = 0;

  /**
   * Registers one more Attendee. With `emailSender`, the Event Pass email goes out on registering
   * (so the Registration reads as sent); without one, SMTP is off and it stays unsent.
   */
  async function register(
    eventDays: string[],
    { emailSender, email }: { emailSender?: EventPassEmailSender; email?: string } = {},
  ): Promise<EventPass> {
    phoneSequence += 1;
    const seeding = createRegistrations({
      db: database.db,
      clock: () => START,
      appUrl: APP_URL,
      ...(emailSender && { emailSender }),
    });
    const result = await seeding.submit({
      ...attendee,
      phone: `08${String(phoneSequence).padStart(8, "0")}`,
      email: email ?? `attendee${phoneSequence}@example.com`,
      eventDays,
    });
    if (result.status !== "accepted") assert.fail(`not accepted: ${JSON.stringify(result)}`);
    return result.pass;
  }

  test("the summary for everyone counts one email per Registration, and each Event Day it chose", async () => {
    await register([OCT_31]);
    await register([OCT_31]);
    await register([OCT_31]);
    await register([NOV_01]);
    await register([NOV_01]);
    await register([OCT_31, NOV_01]);
    const email = fakeEmailSender(fakeClock(START));

    const { throughId, ...summary } = await bulkSendModule(email.sender).bulkSendSummary("all");

    assert.deepEqual(summary, {
      mode: "all",
      emailConfigured: true,
      emails: 6,
      eventDays: [
        { eventDay: OCT_31, registrations: 4 },
        { eventDay: NOV_01, registrations: 3 },
      ],
    });
    assert.equal(typeof throughId, "number");
  });

  test("the summary for unsent counts only Registrations whose Event Pass email was never sent", async () => {
    const clock = fakeClock(START);
    const email = fakeEmailSender(clock);
    await register([OCT_31], { emailSender: email.sender });
    await register([OCT_31]);
    await register([OCT_31, NOV_01], { emailSender: email.sender });
    await register([NOV_01]);
    await register([OCT_31, NOV_01]);

    const { throughId, ...summary } = await bulkSendModule(email.sender, clock).bulkSendSummary("unsent");

    assert.deepEqual(summary, {
      mode: "unsent",
      emailConfigured: true,
      emails: 3,
      eventDays: [
        { eventDay: OCT_31, registrations: 2 },
        { eventDay: NOV_01, registrations: 2 },
      ],
    });
    assert.equal(typeof throughId, "number");
    assert.equal((await bulkSendModule(email.sender, clock).bulkSendSummary("all")).emails, 5);
  });

  test("with nothing to send, the summary is zero everywhere and has no cursor bound", async () => {
    const email = fakeEmailSender(fakeClock(START));
    await register([OCT_31], { emailSender: email.sender });

    assert.deepEqual(await bulkSendModule(email.sender).bulkSendSummary("unsent"), {
      mode: "unsent",
      emailConfigured: true,
      emails: 0,
      eventDays: [
        { eventDay: OCT_31, registrations: 0 },
        { eventDay: NOV_01, registrations: 0 },
      ],
      throughId: null,
    });
  });

  test("a batch sends at most 25 Event Pass emails, one per Registration in registration order", async () => {
    const passes = [];
    for (let i = 0; i < 30; i++) passes.push(await register([OCT_31]));
    const clock = fakeClock(START);
    const email = fakeEmailSender(clock);
    const registrations = bulkSendModule(email.sender, clock);

    const batch = await registrations.sendEventPassBatch({ mode: "all", afterId: 0 });
    const asked = await registrations.sendEventPassBatch({ mode: "all", afterId: 0, maxMessages: 100 });

    assert.equal(batch.status, "processed");
    assert.equal(batch.done, false);
    assert.deepEqual(
      batch.results.map(({ passCode, status }) => ({ passCode, status })),
      passes.slice(0, 25).map(({ passCode }) => ({ passCode, status: "sent" })),
    );
    assert.equal(batch.nextAfterId, batch.results.at(-1)?.id);
    assert.equal(asked.status === "processed" && asked.results.length, 25);
    assert.deepEqual(
      email.messages.slice(0, 25).map(({ to, passLink, pass }) => ({ to, passLink, pass })),
      passes.slice(0, 25).map((pass, i) => ({
        to: `attendee${i + 1}@example.com`,
        passLink: `${APP_URL}/p/${pass.token}`,
        pass,
      })),
    );
  });

  test("following the cursor emails every Registration exactly once, then reports done", async () => {
    const passes = [];
    for (let i = 0; i < 60; i++) passes.push(await register(i % 3 === 0 ? [OCT_31, NOV_01] : [NOV_01]));
    const clock = fakeClock(START);
    const email = fakeEmailSender(clock);
    const registrations = bulkSendModule(email.sender, clock);

    const batchSizes: number[] = [];
    const sentPassCodes: string[] = [];
    let afterId = 0;
    for (let request = 1; ; request++) {
      assert.ok(request <= 10, "the cursor keeps moving");
      const batch = await registrations.sendEventPassBatch({ mode: "all", afterId });
      if (batch.status !== "processed") assert.fail(`not processed: ${JSON.stringify(batch)}`);
      batchSizes.push(batch.results.length);
      sentPassCodes.push(...batch.results.filter((r) => r.status === "sent").map((r) => r.passCode));
      afterId = batch.nextAfterId;
      if (batch.done) break;
    }

    assert.deepEqual(batchSizes, [25, 25, 10]);
    assert.deepEqual(sentPassCodes, passes.map(({ passCode }) => passCode));
    assert.equal(email.messages.length, 60);
    assert.deepEqual(await registrations.sendEventPassBatch({ mode: "all", afterId }), {
      status: "processed",
      results: [],
      nextAfterId: afterId,
      done: true,
    });
  });

  test("unsent skips Registrations already sent their Event Pass, and then nothing is left unsent", async () => {
    const clock = fakeClock(START);
    const onRegistering = fakeEmailSender(clock);
    const unsent = [];
    for (let i = 0; i < 8; i++) {
      if (i % 2 === 0) await register([OCT_31], { emailSender: onRegistering.sender });
      else unsent.push(await register([OCT_31]));
    }
    const email = fakeEmailSender(clock);
    const registrations = bulkSendModule(email.sender, clock);

    const batch = await registrations.sendEventPassBatch({ mode: "unsent", afterId: 0 });

    assert.equal(batch.status, "processed");
    assert.deepEqual(
      batch.results.map(({ passCode, status }) => ({ passCode, status })),
      unsent.map(({ passCode }) => ({ passCode, status: "sent" })),
    );
    assert.equal(batch.done, true);
    assert.deepEqual(email.messages.map(({ pass }) => pass), unsent);
    assert.equal((await registrations.bulkSendSummary("unsent")).emails, 0);
    const again = await registrations.sendEventPassBatch({ mode: "unsent", afterId: 0 });
    assert.equal(again.status === "processed" && again.results.length, 0);
  });

  test("a slow SMTP server ends the batch early, once 60 seconds have passed, with a cursor to go on from", async () => {
    const passes = [];
    for (let i = 0; i < 10; i++) passes.push(await register([OCT_31]));
    const clock = fakeClock(START);
    // Sends start at 0, 25 and 50 s; at 75 s the budget is spent, so no fourth send starts.
    const email = fakeEmailSender(clock, { sendMs: 25_000 });
    const registrations = bulkSendModule(email.sender, clock);

    const first = await registrations.sendEventPassBatch({ mode: "all", afterId: 0 });
    if (first.status !== "processed") assert.fail("not processed");
    const second = await registrations.sendEventPassBatch({ mode: "all", afterId: first.nextAfterId });
    if (second.status !== "processed") assert.fail("not processed");
    const shorter = await registrations.sendEventPassBatch({
      mode: "all",
      afterId: second.nextAfterId,
      timeBudgetMs: 20_000,
    });

    assert.deepEqual(first.results.map(({ passCode }) => passCode), passes.slice(0, 3).map(({ passCode }) => passCode));
    assert.equal(first.done, false);
    assert.deepEqual(second.results.map(({ passCode }) => passCode), passes.slice(3, 6).map(({ passCode }) => passCode));
    assert.equal(shorter.status === "processed" && shorter.results.length, 1);
    assert.equal(email.messages.length, 7);
  });

  test("a batch always tries at least one email, so the cursor moves even when the budget is already spent", async () => {
    const [first] = [await register([OCT_31]), await register([OCT_31])];
    const clock = fakeClock(START);
    const email = fakeEmailSender(clock);

    const batch = await bulkSendModule(email.sender, clock).sendEventPassBatch({
      mode: "all",
      afterId: 0,
      timeBudgetMs: -1,
    });

    assert.equal(batch.status, "processed");
    assert.deepEqual(batch.results.map(({ passCode }) => passCode), [first.passCode]);
    assert.equal(batch.done, false);
  });

  test("a failed send is recorded with its reason, the batch goes on, and the Registration stays unsent", async () => {
    const first = await register([OCT_31]);
    const bounced = await register([OCT_31], { email: "no-such-mailbox@example.com" });
    const third = await register([NOV_01]);
    const clock = fakeClock(START);
    const email = fakeEmailSender(clock, {
      failFor: ({ to }) => (to.startsWith("no-such-mailbox") ? "EENVELOPE: Recipient rejected" : undefined),
    });
    const registrations = bulkSendModule(email.sender, clock);

    const batch = await registrations.sendEventPassBatch({ mode: "all", afterId: 0 });

    if (batch.status !== "processed") assert.fail("not processed");
    assert.deepEqual(
      batch.results.map(withoutId),
      [
        { passCode: first.passCode, givenName: "วิชัย", familyName: "ใจดี", email: "attendee1@example.com", status: "sent" },
        {
          passCode: bounced.passCode,
          givenName: "วิชัย",
          familyName: "ใจดี",
          email: "no-such-mailbox@example.com",
          status: "failed",
          reason: "EENVELOPE: Recipient rejected",
        },
        { passCode: third.passCode, givenName: "วิชัย", familyName: "ใจดี", email: "attendee3@example.com", status: "sent" },
      ],
    );
    assert.equal(batch.done, true);
    assert.deepEqual(await registrations.bulkSendSummary("unsent"), {
      mode: "unsent",
      emailConfigured: true,
      emails: 1,
      eventDays: [
        { eventDay: OCT_31, registrations: 1 },
        { eventDay: NOV_01, registrations: 0 },
      ],
      throughId: batch.results[1].id,
    });
  });

  test("with SMTP not configured, a batch sends nothing and says so, and the summary shows it", async () => {
    await register([OCT_31]);
    await register([OCT_31, NOV_01]);
    const email = fakeEmailSender(fakeClock(START));
    const registrations = bulkSendModule({ ...email.sender, configured: false });

    assert.deepEqual(await registrations.sendEventPassBatch({ mode: "unsent", afterId: 0 }), {
      status: "email-not-configured",
    });
    assert.equal(email.messages.length, 0);
    const summary = await registrations.bulkSendSummary("unsent");
    assert.equal(summary.emailConfigured, false);
    assert.equal(summary.emails, 2);
  });

  test("a send bounded by the summary's throughId leaves out Registrations made after the summary", async () => {
    const confirmed = [await register([OCT_31]), await register([NOV_01])];
    const clock = fakeClock(START);
    const email = fakeEmailSender(clock);
    const registrations = bulkSendModule(email.sender, clock);
    const { throughId } = await registrations.bulkSendSummary("all");
    if (throughId === null) assert.fail("nothing to send");
    await register([OCT_31]); // arrives while Staff read the summary

    const batch = await registrations.sendEventPassBatch({ mode: "all", afterId: 0, throughId });

    assert.equal(batch.status, "processed");
    assert.deepEqual(batch.results.map(({ passCode }) => passCode), confirmed.map(({ passCode }) => passCode));
    assert.equal(batch.done, true);
  });

  /** The module under test, with a controllable clock and a fake sender. */
  function bulkSendModule(emailSender: EventPassEmailSender, clock: FakeClock = fakeClock(START)) {
    return createRegistrations({
      db: database.db,
      clock: clock.now,
      emailSender,
      appUrl: APP_URL,
    });
  }
});

/** A batch result without its Registration id, which the database assigns. */
function withoutId<T extends { id: number }>({ id, ...rest }: T): Omit<T, "id"> {
  void id;
  return rest;
}

type FakeClock ={ now: () => Date; advance: (ms: number) => void };

/** A clock that only moves when told to, starting at `start`. */
function fakeClock(start: Date): FakeClock {
  let time = start.getTime();
  return {
    now: () => new Date(time),
    advance: (ms) => {
      time += ms;
    },
  };
}

/**
 * A configured email sender that keeps every message. Each send takes `sendMs` on `clock`, and
 * fails with `failFor(message)` when that returns an error.
 */
function fakeEmailSender(
  clock: FakeClock,
  { sendMs = 1_000, failFor }: { sendMs?: number; failFor?: (message: EventPassMessage) => string | undefined } = {},
) {
  const messages: EventPassMessage[] = [];
  const sender: EventPassEmailSender = {
    configured: true,
    async send(message) {
      messages.push(message);
      clock.advance(sendMs);
      const error = failFor?.(message);
      return error ? { success: false, error } : { success: true };
    },
  };
  return { sender, messages };
}

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
