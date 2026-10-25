import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { createTestDatabase } from "@/test-support/database";
import type { RegistrationForm } from "./fields";
import {
  type EventPassEmailSender,
  type EventPassMessage,
  type SendResult,
  unconfiguredEmailSender,
} from "./ports";
import { createRegistrations } from "./registrations";

describe("Registration module: Event Pass email status and single resend", () => {
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

  const registeredAt = new Date("2026-10-25T03:15:00.000Z");
  const resentAt = new Date("2026-10-28T09:40:00.000Z");

  /** The Registration module as it runs at `time`, sending through `emailSender`. */
  function registrationsAt(time: Date, emailSender: EventPassEmailSender) {
    return createRegistrations({
      db: database.db,
      clock: () => time,
      emailSender,
      appUrl: "https://register.stemracing.example",
    });
  }

  /** Registers `changes` on top of a valid Attendee and returns their row in the Back Office list. */
  async function register(emailSender: EventPassEmailSender, changes: Partial<RegistrationForm> = {}) {
    const result = await registrationsAt(registeredAt, emailSender).submit({ ...attendee, ...changes });
    assert.equal(result.status, "accepted", JSON.stringify(result));
    return listRow(result.pass.passCode);
  }

  /** The Registration's row as Staff see it in the Back Office list. */
  async function listRow(passCode: string) {
    const { rows } = await registrationsAt(registeredAt, unconfiguredEmailSender).search({
      q: passCode,
      page: 1,
      pageSize: 10,
    });
    assert.equal(rows.length, 1, `one row for ${passCode}`);
    return rows[0];
  }

  /** The email status Staff see for a Registration. */
  async function emailStatus(passCode: string) {
    const { emailSentCount, lastEmailSentAt } = await listRow(passCode);
    return { emailSentCount, lastEmailSentAt };
  }

  test("the Back Office list shows how many times each Event Pass was emailed, and when last", async () => {
    const sent = await register(fakeEmailSender({ success: true }).sender);
    const unsent = await register(fakeEmailSender({ success: false, error: "EAUTH: Invalid login" }).sender, {
      givenName: "วิภา",
    });

    assert.deepEqual(await emailStatus(sent.passCode), { emailSentCount: 1, lastEmailSentAt: registeredAt });
    assert.deepEqual(await emailStatus(unsent.passCode), { emailSentCount: 0, lastEmailSentAt: null });
  });

  test("Staff resend one Event Pass: it goes to the registered address and is counted with the time", async () => {
    const registration = await register(fakeEmailSender({ success: true }).sender, {
      email: "Wichai.J@Example.com",
    });
    const email = fakeEmailSender({ success: true });

    const result = await registrationsAt(resentAt, email.sender).resendEventPass(registration.id);

    assert.deepEqual(result, { status: "sent" });
    assert.equal(email.messages.length, 1);
    assert.equal(email.messages[0].to, "Wichai.J@Example.com");
    assert.equal(email.messages[0].pass.passCode, registration.passCode);
    assert.match(email.messages[0].passLink, /^https:\/\/register\.stemracing\.example\/p\/[0-9a-f-]{36}$/);
    assert.deepEqual(await emailStatus(registration.passCode), { emailSentCount: 2, lastEmailSentAt: resentAt });
  });

  test("a failed resend reports the email server's reason and leaves the email status as it was", async () => {
    const registration = await register(fakeEmailSender({ success: true }).sender);
    const email = fakeEmailSender({ success: false, error: "ESOCKET: connect ECONNREFUSED 127.0.0.1:465" });

    const result = await registrationsAt(resentAt, email.sender).resendEventPass(registration.id);

    assert.deepEqual(result, { status: "failed", reason: "ESOCKET: connect ECONNREFUSED 127.0.0.1:465" });
    assert.equal(email.messages.length, 1);
    assert.deepEqual(await emailStatus(registration.passCode), { emailSentCount: 1, lastEmailSentAt: registeredAt });
  });

  test("with email not configured, nothing is sent and Staff are told so", async () => {
    const registration = await register(unconfiguredEmailSender);
    const email = fakeEmailSender({ success: true });
    const unconfigured: EventPassEmailSender = { ...email.sender, configured: false };

    const result = await registrationsAt(resentAt, unconfigured).resendEventPass(registration.id);

    assert.deepEqual(result, { status: "email-not-configured" });
    assert.equal(email.messages.length, 0);
    assert.deepEqual(await emailStatus(registration.passCode), { emailSentCount: 0, lastEmailSentAt: null });
  });

  test("an id with no Registration, such as one just deleted, is not found and sends nothing", async () => {
    const registration = await register(unconfiguredEmailSender);
    const email = fakeEmailSender({ success: true });
    const registrations = registrationsAt(resentAt, email.sender);

    // Beyond Postgres' integer range, fractional and non-positive ids can't be Registrations either.
    for (const id of [registration.id + 1, 0, -1, 1.5, Number.NaN, 2 ** 31]) {
      assert.deepEqual(await registrations.resendEventPass(id), { status: "not-found" }, `id ${id}`);
    }
    assert.equal(email.messages.length, 0);
  });
});

/** A configured email sender that answers every message with `result` and keeps what it was given. */
function fakeEmailSender(result: SendResult) {
  const messages: EventPassMessage[] = [];
  const sender: EventPassEmailSender = {
    configured: true,
    async send(message) {
      messages.push(message);
      return result;
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
  eventDays: ["2026-10-31"],
  referralSources: ["facebook"],
  referralOther: "",
  competingTeamCheeredFor: "",
  comments: "",
  pdpaAcknowledged: true,
};
