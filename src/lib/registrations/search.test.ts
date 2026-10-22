import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { createTestDatabase } from "@/test-support/database";
import type { RegistrationForm } from "./fields";
import { createRegistrations, type EventPass } from "./registrations";
import type { RegistrationSearch } from "./search-params";

describe("Registration module: searching Registrations", () => {
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

  async function register(changes: Partial<RegistrationForm> = {}): Promise<EventPass> {
    const result = await registrations.submit({ ...attendee, ...changes });
    assert.equal(result.status, "accepted", JSON.stringify(result));
    return result.pass;
  }

  async function search(input: Partial<RegistrationSearch> = {}) {
    return registrations.search({ page: 1, pageSize: 25, ...input });
  }

  /** "given family" of each row, in the order returned. */
  async function namesFound(input: Partial<RegistrationSearch> = {}) {
    const { rows } = await search(input);
    return rows.map((row) => `${row.givenName} ${row.familyName}`);
  }

  test("lists every Registration newest first, with the total", async () => {
    await register({ givenName: "วิชัย" });
    await register({ givenName: "วิภา" });
    await register({ givenName: "Alice", familyName: "Smith" });

    const result = await search();

    assert.equal(result.total, 3);
    assert.deepEqual(
      result.rows.map((row) => `${row.givenName} ${row.familyName}`),
      ["Alice Smith", "วิภา ใจดี", "วิชัย ใจดี"],
    );
  });

  describe("search", () => {
    test("matches part of a given name", async () => {
      await register({ givenName: "วิชัย", familyName: "ใจดี" });
      await register({ givenName: "สมศรี", familyName: "รักเรียน", phone: "089-876-5432" });

      assert.deepEqual(await namesFound({ q: "ชัย" }), ["วิชัย ใจดี"]);
    });

    test("matches part of a family name, and a full name with extra spaces", async () => {
      await register({ givenName: "วิชัย", familyName: "ใจดี" });
      await register({ givenName: "สมศรี", familyName: "รักเรียน", phone: "089-876-5432" });

      assert.deepEqual(await namesFound({ q: "รักเรียน" }), ["สมศรี รักเรียน"]);
      assert.deepEqual(await namesFound({ q: "  วิชัย   ใจดี " }), ["วิชัย ใจดี"]);
    });

    test("matches Latin names in any case", async () => {
      await register({ givenName: "Alice", familyName: "Smith" });
      await register({ givenName: "วิชัย", familyName: "ใจดี" });

      assert.deepEqual(await namesFound({ q: "aLiCe" }), ["Alice Smith"]);
      assert.deepEqual(await namesFound({ q: "SMITH" }), ["Alice Smith"]);
    });

    test("matches part of an email address in any case", async () => {
      await register({ givenName: "วิชัย", email: "Wichai.J@Example.com" });
      await register({ givenName: "วิภา", email: "wipa@school.ac.th" });

      assert.deepEqual(await namesFound({ q: "wichai.j@example" }), ["วิชัย ใจดี"]);
      assert.deepEqual(await namesFound({ q: "SCHOOL.AC" }), ["วิภา ใจดี"]);
    });

    test("matches a phone number typed the local way, whole or from the start", async () => {
      await register({ givenName: "วิชัย", phone: "081-234-5678" });
      await register({ givenName: "วิภา", phone: "02-123-4567" });

      assert.deepEqual(await namesFound({ q: "081-234-5678" }), ["วิชัย ใจดี"]);
      assert.deepEqual(await namesFound({ q: "0812345678" }), ["วิชัย ใจดี"]);
      assert.deepEqual(await namesFound({ q: "081 234" }), ["วิชัย ใจดี"]);
      assert.deepEqual(await namesFound({ q: "021234567" }), ["วิภา ใจดี"]);
    });

    test("matches a phone number in E.164 form, with or without spacing, and its last digits", async () => {
      await register({ givenName: "วิชัย", phone: "081-234-5678" });
      await register({ givenName: "วิภา", phone: "089-876-5432" });

      assert.deepEqual(await namesFound({ q: "+66812345678" }), ["วิชัย ใจดี"]);
      assert.deepEqual(await namesFound({ q: "+66 81-234-5678" }), ["วิชัย ใจดี"]);
      assert.deepEqual(await namesFound({ q: "+66 081 234 5678" }), ["วิชัย ใจดี"]);
      assert.deepEqual(await namesFound({ q: "5432" }), ["วิภา ใจดี"]);
    });

    test("matches a Pass Code with or without its EP- prefix, in any case and spacing", async () => {
      const codes = ["EP-7KQ2MZ9H", "EP-ABCDEFGH"];
      const withKnownCodes = createRegistrations({
        db: database.db,
        clock: beforeTheEvent,
        generatePassCode: () => codes.shift()!,
      });
      await withKnownCodes.submit({ ...attendee, givenName: "วิชัย" });
      await withKnownCodes.submit({ ...attendee, givenName: "วิภา" });

      for (const typed of ["EP-7KQ2MZ9H", "ep-7kq2mz9h", "7kq2mz9h", "7KQ2-MZ9H", "ep 7kq2 mz9h"]) {
        assert.deepEqual(await namesFound({ q: typed }), ["วิชัย ใจดี"], typed);
      }
      assert.deepEqual(await namesFound({ q: "7kq2" }), ["วิชัย ใจดี"], "part of a Pass Code");
    });

    test("treats % and _ as ordinary characters", async () => {
      await register({ givenName: "วิชัย" });

      assert.deepEqual(await namesFound({ q: "%" }), []);
      assert.deepEqual(await namesFound({ q: "_" }), []);
    });

    test("a blank search lists everything", async () => {
      await register({ givenName: "วิชัย" });
      await register({ givenName: "วิภา" });

      assert.equal((await search({ q: "   " })).total, 2);
    });
  });

  describe("filters", () => {
    test("an Event Day keeps Registrations that chose that day, alone or with others", async () => {
      await register({ givenName: "วิชัย", eventDays: ["2026-10-31"] });
      await register({ givenName: "วิภา", eventDays: ["2026-11-01"] });
      await register({ givenName: "วิทยา", eventDays: ["2026-10-31", "2026-11-01"] });

      assert.deepEqual(await namesFound({ day: "2026-10-31" }), ["วิทยา ใจดี", "วิชัย ใจดี"]);
      assert.deepEqual(await namesFound({ day: "2026-11-01" }), ["วิทยา ใจดี", "วิภา ใจดี"]);
    });

    test("an Attendee Role keeps only that role", async () => {
      await register({ givenName: "วิชัย", role: "parent" });
      await register({ givenName: "วิภา", role: "teacher" });
      await register({ givenName: "วิทยา", role: "teacher" });

      assert.deepEqual(await namesFound({ role: "teacher" }), ["วิทยา ใจดี", "วิภา ใจดี"]);
      assert.deepEqual(await namesFound({ role: "sponsor" }), []);
    });

    test("an Event Day, an Attendee Role and a search combine", async () => {
      await register({ givenName: "วิชัย", role: "teacher", eventDays: ["2026-10-31"] });
      await register({ givenName: "วิภา", role: "teacher", eventDays: ["2026-11-01"] });
      await register({ givenName: "วิทยา", role: "parent", eventDays: ["2026-10-31"] });
      await register({ givenName: "สมศรี", role: "teacher", eventDays: ["2026-10-31", "2026-11-01"] });

      const result = await search({ day: "2026-10-31", role: "teacher" });
      assert.deepEqual(
        result.rows.map((row) => row.givenName),
        ["สมศรี", "วิชัย"],
      );
      assert.equal(result.total, 2);
      assert.deepEqual(await namesFound({ day: "2026-10-31", role: "teacher", q: "วิ" }), ["วิชัย ใจดี"]);
    });
  });

  describe("sorting", () => {
    // Thai dictionary order files a leading vowel (เ แ โ ใ ไ) under the consonant after it,
    // so ใจดี sorts under จ, not after every name that starts with a consonant.
    async function registerFamilies() {
      await register({ givenName: "สมศรี", familyName: "ใจดี" });
      await register({ givenName: "กมล", familyName: "สุขใจ" });
      await register({ givenName: "วิภา", familyName: "กล้าหาญ" });
      await register({ givenName: "อรุณ", familyName: "เก่งกาจ" });
    }

    test("by family name, A to Z and Z to A, in Thai dictionary order", async () => {
      await registerFamilies();

      const ascending = ["วิภา กล้าหาญ", "อรุณ เก่งกาจ", "สมศรี ใจดี", "กมล สุขใจ"];
      assert.deepEqual(await namesFound({ sort: "familyName.asc" }), ascending);
      assert.deepEqual(await namesFound({ sort: "familyName.desc" }), ascending.toReversed());
    });

    test("by given name", async () => {
      await registerFamilies();

      assert.deepEqual(await namesFound({ sort: "givenName.asc" }), [
        "กมล สุขใจ",
        "วิภา กล้าหาญ",
        "สมศรี ใจดี",
        "อรุณ เก่งกาจ",
      ]);
    });

    test("by created time, oldest first", async () => {
      await registerFamilies();

      assert.deepEqual(await namesFound({ sort: "createdAt.asc" }), [
        "สมศรี ใจดี",
        "กมล สุขใจ",
        "วิภา กล้าหาญ",
        "อรุณ เก่งกาจ",
      ]);
    });

    test("a column that is not sortable falls back to newest first", async () => {
      await registerFamilies();
      const notAllowed = "email.asc" as unknown as RegistrationSearch["sort"];

      assert.deepEqual(await namesFound({ sort: notAllowed }), await namesFound());
      assert.deepEqual((await namesFound())[0], "อรุณ เก่งกาจ");
    });
  });

  describe("pagination", () => {
    /** Registers `count` Attendees named "Attendee aa", "Attendee ab", … in that order. */
    async function registerMany(count: number) {
      const letters = (index: number) =>
        String.fromCharCode(97 + Math.floor(index / 26), 97 + (index % 26));
      for (let index = 0; index < count; index++) {
        await register({ givenName: "Attendee", familyName: letters(index) });
      }
    }

    test("pages hold pageSize rows, newest first, and every page reports the full total", async () => {
      await registerMany(12);

      const first = await search({ page: 1, pageSize: 10 });
      const second = await search({ page: 2, pageSize: 10 });
      const beyond = await search({ page: 3, pageSize: 10 });

      assert.equal(first.rows.length, 10);
      assert.equal(first.rows[0].familyName, "al");
      assert.deepEqual(
        second.rows.map((row) => row.familyName),
        ["ab", "aa"],
      );
      assert.deepEqual([first.total, second.total, beyond.total], [12, 12, 12]);
      assert.deepEqual(beyond.rows, []);
    });

    test("totals count only what matches the search and filters", async () => {
      await registerMany(11);
      await register({ givenName: "วิชัย", role: "teacher" });

      const result = await search({ role: "teacher", pageSize: 10 });
      assert.equal(result.total, 1);
      assert.equal(result.rows.length, 1);
      assert.equal((await search({ q: "Attendee", pageSize: 10 })).total, 11);
    });

    test("a page below 1 reads as the first page", async () => {
      await registerMany(2);

      const result = await search({ page: 0, pageSize: 10 });
      assert.equal(result.page, 1);
      assert.equal(result.rows.length, 2);
      assert.equal((await search({ page: -3, pageSize: 10 })).page, 1);
    });

    test("the page size is clamped to between 10 and 100", async () => {
      await registerMany(105);

      const tooSmall = await search({ pageSize: 1 });
      assert.equal(tooSmall.pageSize, 10);
      assert.equal(tooSmall.rows.length, 10);

      const tooLarge = await search({ pageSize: 1000 });
      assert.equal(tooLarge.pageSize, 100);
      assert.equal(tooLarge.rows.length, 100);
      assert.equal(tooLarge.total, 105);
    });
  });
});

/** Before the Event, so every Event Day is still open for registration. */
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
