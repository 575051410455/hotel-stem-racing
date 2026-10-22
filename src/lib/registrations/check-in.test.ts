import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { checkIns } from "@/lib/db/schema";
import { createTestDatabase } from "@/test-support/database";
import type { RegistrationForm } from "./fields";
import { createRegistrations } from "./registrations";

describe("Check-In", () => {
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

  /** Registers วิชัย ใจดี before the Event, with a known Pass Code. */
  async function register(changes: Partial<RegistrationForm> = {}, passCode = "EP-7KQ2MZ9H") {
    const result = await createRegistrations({
      db: database.db,
      clock: () => new Date("2026-10-22T12:00:00+07:00"),
      generatePassCode: () => passCode,
    }).submit({ ...attendee, ...changes });
    assert.equal(result.status, "accepted");
    return result.pass;
  }

  /**
   * Every Check-In row, oldest first. The Back Office has no Check-In view yet, so the tests read
   * the table to see what was recorded, including the Staff Account.
   */
  const storedCheckIns = () =>
    database.db
      .select({
        eventDay: checkIns.eventDay,
        checkedInAt: checkIns.checkedInAt,
        staffAccountId: checkIns.staffAccountId,
        outsideRegisteredDay: checkIns.outsideRegisteredDay,
      })
      .from(checkIns)
      .orderBy(checkIns.id);

  test("a first Check-In for today succeeds with the Attendee's name, Attendee Role and Pass Code", async () => {
    await register();

    const result = await at("2026-10-31T09:00:00").checkIn({
      scan: "EP-7KQ2MZ9H",
      staffAccountId: "staff-account-1",
    });

    assert.deepEqual(result, {
      status: "checked-in",
      eventDay: "2026-10-31",
      checkedInAt: new Date("2026-10-31T09:00:00+07:00"),
      attendee: {
        givenName: "วิชัย",
        familyName: "ใจดี",
        role: "parent",
        passCode: "EP-7KQ2MZ9H",
        eventDays: ["2026-10-31", "2026-11-01"],
      },
    });
  });

  test("a repeat on the same Event Day records nothing new and reports the original time", async () => {
    await register();
    await at("2026-10-31T09:00:00").checkIn({ scan: "EP-7KQ2MZ9H", staffAccountId: "staff-account-1" });

    const repeat = await at("2026-10-31T13:45:00").checkIn({
      scan: "EP-7KQ2MZ9H",
      staffAccountId: "staff-account-2",
    });

    assert.deepEqual(repeat, {
      status: "already-checked-in",
      eventDay: "2026-10-31",
      checkedInAt: new Date("2026-10-31T09:00:00+07:00"),
      outsideRegisteredDay: false,
      attendee: {
        givenName: "วิชัย",
        familyName: "ใจดี",
        role: "parent",
        passCode: "EP-7KQ2MZ9H",
        eventDays: ["2026-10-31", "2026-11-01"],
      },
    });
    assert.deepEqual(await storedCheckIns(), [
      {
        eventDay: "2026-10-31",
        checkedInAt: new Date("2026-10-31T09:00:00+07:00"),
        staffAccountId: "staff-account-1",
        outsideRegisteredDay: false,
      },
    ]);
  });

  test("coming back on the other Event Day is a new Check-In", async () => {
    await register();
    await at("2026-10-31T09:00:00").checkIn({ scan: "EP-7KQ2MZ9H", staffAccountId: "staff-account-1" });

    const secondDay = await at("2026-11-01T10:30:00").checkIn({
      scan: "EP-7KQ2MZ9H",
      staffAccountId: "staff-account-2",
    });

    assert.equal(secondDay.status, "checked-in");
    assert.equal(secondDay.eventDay, "2026-11-01");
    assert.deepEqual(secondDay.checkedInAt, new Date("2026-11-01T10:30:00+07:00"));
    assert.deepEqual(await storedCheckIns(), [
      {
        eventDay: "2026-10-31",
        checkedInAt: new Date("2026-10-31T09:00:00+07:00"),
        staffAccountId: "staff-account-1",
        outsideRegisteredDay: false,
      },
      {
        eventDay: "2026-11-01",
        checkedInAt: new Date("2026-11-01T10:30:00+07:00"),
        staffAccountId: "staff-account-2",
        outsideRegisteredDay: false,
      },
    ]);
  });

  test("a Check-In on an Event Day the Attendee didn't choose is recorded, flagged and reported with their days", async () => {
    await register({ eventDays: ["2026-11-01"] });

    const result = await at("2026-10-31T09:00:00").checkIn({
      scan: "EP-7KQ2MZ9H",
      staffAccountId: "staff-account-1",
    });

    assert.deepEqual(result, {
      status: "checked-in-outside-registered-day",
      eventDay: "2026-10-31",
      checkedInAt: new Date("2026-10-31T09:00:00+07:00"),
      attendee: {
        givenName: "วิชัย",
        familyName: "ใจดี",
        role: "parent",
        passCode: "EP-7KQ2MZ9H",
        eventDays: ["2026-11-01"],
      },
    });
    assert.deepEqual(await storedCheckIns(), [
      {
        eventDay: "2026-10-31",
        checkedInAt: new Date("2026-10-31T09:00:00+07:00"),
        staffAccountId: "staff-account-1",
        outsideRegisteredDay: true,
      },
    ]);
  });

  test("a repeat of a Check-In outside the registered days says so", async () => {
    await register({ eventDays: ["2026-11-01"] });
    await at("2026-10-31T09:00:00").checkIn({ scan: "EP-7KQ2MZ9H", staffAccountId: "staff-account-1" });

    const repeat = await at("2026-10-31T09:05:00").checkIn({
      scan: "EP-7KQ2MZ9H",
      staffAccountId: "staff-account-1",
    });

    assert.equal(repeat.status, "already-checked-in");
    assert.equal(repeat.outsideRegisteredDay, true);
    assert.deepEqual(repeat.checkedInAt, new Date("2026-10-31T09:00:00+07:00"));
  });

  test("text that isn't an Event Pass, or an unknown token or Pass Code, is not an Event Pass and records nothing", async () => {
    await register();
    const registrations = at("2026-10-31T09:00:00");

    for (const scan of [
      "https://www.facebook.com/stemracingthailand",
      "EP-7KQ2MZ90",
      "EP-AAAAAAAA",
      "6c1d1b0e-2f5a-4b8e-9c3d-7e6f5a4b3c2d",
      "https://register.example.org/p/6c1d1b0e-2f5a-4b8e-9c3d-7e6f5a4b3c2d",
    ]) {
      assert.deepEqual(
        await registrations.checkIn({ scan, staffAccountId: "staff-account-1" }),
        { status: "not-an-event-pass" },
        scan,
      );
    }
    assert.deepEqual(await storedCheckIns(), []);
  });

  test("a Pass Code typed in lower case with spaces, an old-domain link and a bare token all find the Event Pass", async () => {
    const { token } = await register();
    const registrations = at("2026-10-31T09:00:00");

    const outcomes = [];
    for (const scan of [
      "ep 7kq2 mz9h",
      `https://old-domain.example.org/p/${token}`,
      token.toUpperCase(),
    ]) {
      const result = await registrations.checkIn({ scan, staffAccountId: "staff-account-1" });
      outcomes.push([result.status, "attendee" in result && result.attendee.passCode]);
    }

    assert.deepEqual(outcomes, [
      ["checked-in", "EP-7KQ2MZ9H"],
      ["already-checked-in", "EP-7KQ2MZ9H"],
      ["already-checked-in", "EP-7KQ2MZ9H"],
    ]);
  });

  test("Staff scanning the same Event Pass at the same moment record one Check-In", async () => {
    const { token } = await register();
    const entrances = Array.from({ length: 6 }, (_, i) => ({
      registrations: at(`2026-10-31T09:00:0${i}`),
      staffAccountId: `staff-account-${i}`,
    }));

    const results = await Promise.all(
      entrances.map(({ registrations, staffAccountId }, i) =>
        registrations.checkIn({ scan: i % 2 ? token : "EP-7KQ2MZ9H", staffAccountId }),
      ),
    );

    const checkedIn = results.filter((result) => result.status === "checked-in");
    const repeats = results.filter((result) => result.status === "already-checked-in");
    assert.equal(checkedIn.length, 1);
    assert.equal(repeats.length, 5);
    const [stored] = await storedCheckIns();
    assert.equal((await storedCheckIns()).length, 1);
    for (const repeat of repeats) assert.deepEqual(repeat.checkedInAt, stored.checkedInAt);
    assert.deepEqual(checkedIn[0].checkedInAt, stored.checkedInAt);
  });

  describe("the Event Day", () => {
    test("today's Event Day follows Bangkok time, whatever the server's time zone", async () => {
      await register();

      const lateOnTheFirstDay = await at("2026-10-31T23:59:00").checkIn({
        scan: "EP-7KQ2MZ9H",
        staffAccountId: "staff-account-1",
      });
      const justAfterMidnight = await at("2026-11-01T00:00:00").checkIn({
        scan: "EP-7KQ2MZ9H",
        staffAccountId: "staff-account-1",
      });

      assert.equal(lateOnTheFirstDay.status === "checked-in" && lateOnTheFirstDay.eventDay, "2026-10-31");
      assert.equal(justAfterMidnight.status === "checked-in" && justAfterMidnight.eventDay, "2026-11-01");
    });

    test("when today isn't an Event Day and none is chosen, the Check-In reports it and records nothing", async () => {
      await register();

      for (const now of ["2026-10-30T09:00:00", "2026-11-02T09:00:00"]) {
        assert.deepEqual(
          await at(now).checkIn({ scan: "EP-7KQ2MZ9H", staffAccountId: "staff-account-1" }),
          { status: "not-an-event-day" },
          now,
        );
      }
      assert.deepEqual(await storedCheckIns(), []);
    });

    test("Staff can choose the Event Day, for example to try Check-In before the Event", async () => {
      await register({ eventDays: ["2026-10-31"] });

      const result = await at("2026-10-22T15:00:00").checkIn({
        scan: "EP-7KQ2MZ9H",
        eventDay: "2026-11-01",
        staffAccountId: "staff-account-1",
      });

      assert.equal(result.status, "checked-in-outside-registered-day");
      assert.equal(result.eventDay, "2026-11-01");
      assert.deepEqual(await storedCheckIns(), [
        {
          eventDay: "2026-11-01",
          checkedInAt: new Date("2026-10-22T15:00:00+07:00"),
          staffAccountId: "staff-account-1",
          outsideRegisteredDay: true,
        },
      ]);
    });

    test("a chosen day that isn't an Event Day is reported and records nothing", async () => {
      await register();

      for (const eventDay of ["2026-11-02", "31/10/2026", ""]) {
        assert.deepEqual(
          await at("2026-10-31T09:00:00").checkIn({
            scan: "EP-7KQ2MZ9H",
            eventDay,
            staffAccountId: "staff-account-1",
          }),
          { status: "not-an-event-day" },
          eventDay,
        );
      }
      assert.deepEqual(await storedCheckIns(), []);
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
  eventDays: ["2026-10-31", "2026-11-01"],
  referralSources: ["facebook"],
  referralOther: "",
  competingTeamCheeredFor: "",
  accessibilityNeeds: "",
  comments: "",
};
