import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { count } from "drizzle-orm";
import { registrations as registrationsTable } from "@/lib/db/schema";
import { createTestDatabase } from "@/test-support/database";
import type { RegistrationForm } from "./fields";
import type { BotCheckVerifier } from "./ports";
import { createRegistrations } from "./registrations";

describe("Bot protection on submitting a Registration", () => {
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

  async function savedRegistrations() {
    const [{ total }] = await database.db.select({ total: count() }).from(registrationsTable);
    return total;
  }

  test("a failed bot check turns the submission away and saves nothing", async () => {
    const checks: [string | undefined, string | undefined][] = [];
    const failingBotCheck: BotCheckVerifier = {
      async verify(token, remoteIp) {
        checks.push([token, remoteIp]);
        return false;
      },
    };
    const registrations = createRegistrations({ db: database.db, clock: beforeTheEvent, botCheck: failingBotCheck });

    const result = await registrations.submit(attendee, {
      botCheckToken: "turnstile-token",
      remoteIp: "203.0.113.7",
    });

    assert.deepEqual(result, { status: "bot-check-failed" });
    assert.deepEqual(checks, [["turnstile-token", "203.0.113.7"]]);
    assert.equal(await savedRegistrations(), 0);
  });

  test("a flood of junk bot-check tokens from one IP is cut off after 300 attempts in 10 minutes", async () => {
    let checks = 0;
    const failingBotCheck: BotCheckVerifier = {
      async verify() {
        checks++;
        return false;
      },
    };
    const registrations = createRegistrations({ db: database.db, clock: beforeTheEvent, botCheck: failingBotCheck });

    for (let n = 0; n < 300; n++) {
      const result = await registrations.submit(attendee, { botCheckToken: "junk", remoteIp: "203.0.113.7" });
      assert.deepEqual(result, { status: "bot-check-failed" }, `attempt ${n + 1}`);
    }
    assert.deepEqual(
      await registrations.submit(attendee, { botCheckToken: "junk", remoteIp: "203.0.113.7" }),
      { status: "rate-limited" },
    );
    assert.equal(checks, 300);
    assert.deepEqual(
      await registrations.submit(attendee, { botCheckToken: "junk", remoteIp: "198.51.100.20" }),
      { status: "bot-check-failed" },
    );
    assert.equal(await savedRegistrations(), 0);
  });

  test("a passed bot check lets the Registration through", async () => {
    const tokens: (string | undefined)[] = [];
    const passingBotCheck: BotCheckVerifier = {
      async verify(token) {
        tokens.push(token);
        return true;
      },
    };
    const registrations = createRegistrations({ db: database.db, clock: beforeTheEvent, botCheck: passingBotCheck });

    const result = await registrations.submit(attendee, {
      botCheckToken: "turnstile-token",
      remoteIp: "203.0.113.7",
    });

    assert.equal(result.status, "accepted");
    assert.deepEqual(tokens, ["turnstile-token"]);
    assert.equal(await savedRegistrations(), 1);
  });

  test("one IP is limited to 60 submissions per 10 minutes; other IPs are not affected", async () => {
    let now = new Date("2026-10-22T12:00:00+07:00");
    const registrations = createRegistrations({ db: database.db, clock: () => now });
    // A different phone each time, so none of these is a Duplicate Registration.
    const submitFrom = (remoteIp: string, n: number) =>
      registrations.submit({ ...attendee, phone: `081-234-${5600 + n}` }, { remoteIp });

    // A queue at the door on the venue Wi-Fi: 60 Attendees five seconds apart, all one IP.
    for (let n = 0; n < 60; n++) {
      assert.equal((await submitFrom("203.0.113.7", n)).status, "accepted", `submission ${n + 1}`);
      now = new Date(now.getTime() + 5_000);
    }
    assert.deepEqual(await submitFrom("203.0.113.7", 60), { status: "rate-limited" });
    assert.equal((await submitFrom("198.51.100.20", 61)).status, "accepted");
    assert.equal(await savedRegistrations(), 61);

    // Ten minutes after the first submission, its slot frees up again.
    now = new Date("2026-10-22T12:10:00+07:00");
    assert.equal((await submitFrom("203.0.113.7", 62)).status, "accepted");
    assert.deepEqual(await submitFrom("203.0.113.7", 63), { status: "rate-limited" });
  });
});

const beforeTheEvent = () => new Date("2026-10-22T12:00:00+07:00");

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
