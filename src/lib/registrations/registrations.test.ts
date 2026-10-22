import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, describe, test } from "node:test";
import { createTestDatabase } from "@/test-support/database";
import type { RegistrationForm } from "./fields";
import { createRegistrations } from "./registrations";

describe("Registration module", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let registrations: ReturnType<typeof createRegistrations>;

  before(async () => {
    database = await createTestDatabase();
    registrations = createRegistrations({ db: database.db });
  });

  beforeEach(async () => {
    await database.reset();
  });

  after(async () => {
    await database.drop();
  });

  test("reports an unknown Event Pass token as not found", async () => {
    const result = await registrations.getEventPass(randomUUID());

    assert.deepEqual(result, { status: "not-found" });
  });

  test("reports a malformed Event Pass token as not found", async () => {
    const result = await registrations.getEventPass("EP-NOT-A-TOKEN");

    assert.deepEqual(result, { status: "not-found" });
  });

  describe("submitting a Registration", () => {
    test("a valid submission returns an Event Pass that can be fetched by its token", async () => {
      const result = await registrations.submit(attendee);

      assert.equal(result.status, "accepted");
      assert.match(result.pass.token, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      assert.match(result.pass.passCode, /^EP-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
      assert.deepEqual(result.pass, {
        token: result.pass.token,
        passCode: result.pass.passCode,
        givenName: "วิชัย",
        familyName: "ใจดี",
        eventDays: ["2026-10-31", "2026-11-01"],
      });
      assert.deepEqual(await registrations.getEventPass(result.pass.token), {
        status: "found",
        pass: result.pass,
      });
    });

    test("invalid fields return their Thai messages and no Event Pass", async () => {
      const result = await registrations.submit({
        ...attendee,
        givenName: "ก",
        phone: "12345",
        email: "wichai@gmail",
        eventDays: [],
      });

      assert.deepEqual(result, {
        status: "invalid",
        fieldErrors: {
          givenName: "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร",
          phone: "กรุณากรอกเบอร์โทรศัพท์มือถือ 10 หลัก หรือเบอร์บ้าน 9 หลัก เช่น 081-234-5678",
          email: "กรุณากรอกอีเมลให้ถูกต้อง เช่น name@example.com",
          eventDays: "กรุณาเลือกวันที่ต้องการเข้าร่วมงานอย่างน้อย 1 วัน",
        },
      });
    });

    test("a Sponsor must name the organisation they represent", async () => {
      const sponsor = { ...attendee, role: "sponsor" };

      assert.deepEqual(await registrations.submit({ ...sponsor, organisation: "" }), {
        status: "invalid",
        fieldErrors: { organisation: "กรุณาระบุบริษัท / องค์กรที่ท่านเป็นตัวแทน" },
      });
      const accepted = await registrations.submit({ ...sponsor, organisation: "บริษัท ตัวอย่าง จำกัด" });
      assert.equal(accepted.status, "accepted");
    });

    test('"Other" Attendee Role and Referral Source each require text', async () => {
      const other = { ...attendee, role: "other", referralSources: ["other"] };

      assert.deepEqual(await registrations.submit({ ...other, roleOther: " ", referralOther: "" }), {
        status: "invalid",
        fieldErrors: {
          roleOther: "กรุณาระบุฐานะการเข้าร่วมงาน",
          referralOther: "กรุณาระบุช่องทางที่ทราบข่าว",
        },
      });
      const accepted = await registrations.submit({ ...other, roleOther: "ศิษย์เก่า", referralOther: "วิทยุ" });
      assert.equal(accepted.status, "accepted");
    });

    test("each Registration gets its own token and Pass Code", async () => {
      const first = await registrations.submit(attendee);
      const second = await registrations.submit({ ...attendee, givenName: "วิภา" });

      assert.equal(first.status, "accepted");
      assert.equal(second.status, "accepted");
      assert.notEqual(first.pass.token, second.pass.token);
      assert.notEqual(first.pass.passCode, second.pass.passCode);
    });

    test("a Pass Code that is already taken is replaced by a fresh one", async () => {
      const codes = ["EP-AAAAAAAA", "EP-AAAAAAAA", "EP-BBBBBBBB"];
      const withRepeats = createRegistrations({ db: database.db, generatePassCode: () => codes.shift()! });

      const first = await withRepeats.submit(attendee);
      const second = await withRepeats.submit({ ...attendee, givenName: "วิภา" });

      assert.equal(first.status === "accepted" && first.pass.passCode, "EP-AAAAAAAA");
      assert.equal(second.status === "accepted" && second.pass.passCode, "EP-BBBBBBBB");
    });
  });
});

const attendee: RegistrationForm = {
  givenName: " วิชัย ",
  familyName: "ใจดี",
  phone: "081-234-5678",
  email: "wichai@example.com",
  role: "parent",
  roleOther: "",
  organisation: "",
  eventDays: ["2026-11-01", "2026-10-31"],
  referralSources: ["facebook", "line"],
  referralOther: "",
  competingTeamCheeredFor: "",
  accessibilityNeeds: "",
  comments: "",
};
