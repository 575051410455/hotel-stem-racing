import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import { registrations as registrationsTable } from "@/lib/db/schema";
import { createTestDatabase } from "@/test-support/database";
import type { RegistrationForm } from "./fields";
import type { EventPassEmailSender, EventPassMessage, SendResult } from "./ports";
import { createRegistrations, type RegistrationDependencies } from "./registrations";

describe("Event Pass email on registration", () => {
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

  const now = new Date("2026-10-25T03:15:00.000Z");

  function registrationsWith(dependencies: Omit<RegistrationDependencies, "db">) {
    return createRegistrations({
      db: database.db,
      clock: () => now,
      appUrl: "https://register.stemracing.example",
      ...dependencies,
    });
  }

  /** What Staff will see as the Registration's email status (ticket 16). */
  async function emailStatus(token: string) {
    const [row] = await database.db
      .select({
        sentCount: registrationsTable.emailSentCount,
        lastSentAt: registrationsTable.lastEmailSentAt,
      })
      .from(registrationsTable)
      .where(eq(registrationsTable.token, token));
    return row;
  }

  test("a sent Event Pass email is counted with the time it was sent", async () => {
    const email = fakeEmailSender({ success: true });

    const result = await registrationsWith({ emailSender: email.sender }).submit(attendee);

    assert.equal(result.status, "accepted");
    assert.deepEqual(await emailStatus(result.pass.token), { sentCount: 1, lastSentAt: now });
  });

  test("one email goes to the registered address with the Event Pass and its link", async () => {
    const email = fakeEmailSender({ success: true });

    const result = await registrationsWith({
      emailSender: email.sender,
      appUrl: "https://register.stemracing.example/",
    }).submit({ ...attendee, email: " Wichai.J@Example.com " });

    assert.equal(result.status, "accepted");
    assert.deepEqual(email.messages, [
      {
        to: "Wichai.J@Example.com",
        passLink: `https://register.stemracing.example/p/${result.pass.token}`,
        pass: result.pass,
      },
    ]);
  });

  test("a failed send still accepts the Registration and leaves it unsent", async () => {
    const email = fakeEmailSender({ success: false, error: "EAUTH: Invalid login" });
    const registrations = registrationsWith({ emailSender: email.sender });

    const result = await registrations.submit(attendee);

    assert.equal(result.status, "accepted");
    assert.equal(email.messages.length, 1);
    assert.deepEqual(await registrations.getEventPass(result.pass.token), { status: "found", pass: result.pass });
    assert.deepEqual(await emailStatus(result.pass.token), { sentCount: 0, lastSentAt: null });
  });

  test("a sender that throws, or a missing APP_URL, is a failed send and not a failed Registration", async () => {
    const throwing: EventPassEmailSender = {
      configured: true,
      async send() {
        throw new Error("socket hang up");
      },
    };
    const withoutAppUrl = fakeEmailSender({ success: true });

    const thrown = await registrationsWith({ emailSender: throwing }).submit(attendee);
    const unlinked = await registrationsWith({ emailSender: withoutAppUrl.sender, appUrl: " " }).submit({
      ...attendee,
      givenName: "วิภา",
    });

    assert.equal(thrown.status, "accepted");
    assert.equal(unlinked.status, "accepted");
    assert.equal(withoutAppUrl.messages.length, 0);
    assert.deepEqual(await emailStatus(thrown.pass.token), { sentCount: 0, lastSentAt: null });
    assert.deepEqual(await emailStatus(unlinked.pass.token), { sentCount: 0, lastSentAt: null });
  });

  test("with SMTP not configured, nothing is sent and the Registration is still accepted", async () => {
    const email = fakeEmailSender({ success: true });
    const unconfigured: EventPassEmailSender = { ...email.sender, configured: false };

    const result = await registrationsWith({ emailSender: unconfigured }).submit(attendee);

    assert.equal(result.status, "accepted");
    assert.equal(email.messages.length, 0);
    assert.deepEqual(await emailStatus(result.pass.token), { sentCount: 0, lastSentAt: null });
  });

  test("the email can wait until after the Attendee's response, and is recorded when it goes", async () => {
    const email = fakeEmailSender({ success: true });
    const deferred: (() => Promise<unknown>)[] = [];

    const result = await registrationsWith({
      emailSender: email.sender,
      afterResponse: (task) => void deferred.push(task),
    }).submit(attendee);

    assert.equal(result.status, "accepted");
    assert.equal(email.messages.length, 0);
    assert.deepEqual(await emailStatus(result.pass.token), { sentCount: 0, lastSentAt: null });

    await Promise.all(deferred.map((task) => task()));

    assert.equal(email.messages.length, 1);
    assert.deepEqual(await emailStatus(result.pass.token), { sentCount: 1, lastSentAt: now });
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
  accessibilityNeeds: "",
  comments: "",
};
