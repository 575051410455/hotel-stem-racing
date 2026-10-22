import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  attendeeRoles,
  emptyRegistrationForm,
  formatPhoneAsYouType,
  maxLengths,
  organisationLabel,
  parseRegistration,
  phoneToE164,
  referralSources,
  type RegistrationForm,
  registrationFormFromFormData,
  validateField,
  validateRegistration,
} from "./fields";

const valid: RegistrationForm = {
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

const withValues = (values: Partial<RegistrationForm>): RegistrationForm => ({ ...valid, ...values });

describe("Field validation: names", () => {
  test("accepts Thai names with vowels and tone marks", () => {
    for (const name of ["วิชัย", "สมศักดิ์", "ณัฐพงศ์", "ไอยรา", "นิ่มนวล", "เจ๊ะ", "ปู"]) {
      assert.equal(validateField("givenName", withValues({ givenName: name })), undefined, name);
      assert.equal(validateField("familyName", withValues({ familyName: name })), undefined, name);
    }
  });

  test("accepts groups joined by a single space, apostrophe or hyphen, and trims the ends", () => {
    for (const name of ["Mary Ann", "O'Brien", "O’Brien", "Jean-Luc", "ณ อยุธยา", "  วิชัย  "]) {
      assert.equal(validateField("givenName", withValues({ givenName: name })), undefined, name);
    }
  });

  test("asks for a missing name in Thai", () => {
    assert.equal(validateField("givenName", withValues({ givenName: "   " })), "กรุณากรอกชื่อ");
    assert.equal(validateField("familyName", withValues({ familyName: "" })), "กรุณากรอกนามสกุล");
  });

  test("rejects digits, symbols, emoji and doubled or dangling separators", () => {
    for (const name of ["J1m", "Ann!", "😀😀", "Mary  Ann", "-Ann", "Ann-", "Jean--Luc", "O''Brien", "ชัย.", "a_b"]) {
      assert.match(validateField("givenName", withValues({ givenName: name })) ?? "", /^ชื่อใช้ได้เฉพาะตัวอักษร/, name);
    }
  });

  test("rejects names shorter than two letters", () => {
    for (const name of ["ก", "A"]) {
      assert.equal(
        validateField("familyName", withValues({ familyName: name })),
        "นามสกุลต้องมีอย่างน้อย 2 ตัวอักษร",
        name,
      );
    }
  });

  test("rejects names longer than the maximum length", () => {
    assert.equal(
      validateField("givenName", withValues({ givenName: "ก".repeat(101) })),
      "ชื่อยาวได้ไม่เกิน 100 ตัวอักษร",
    );
    assert.equal(validateField("givenName", withValues({ givenName: "ก".repeat(100) })), undefined);
  });
});

describe("Field validation: phone", () => {
  test("accepts every Thai mobile and landline format and stores it as E.164", () => {
    const accepted: [typed: string, e164: string][] = [
      ["0812345678", "+66812345678"],
      ["081-234-5678", "+66812345678"],
      ["081 234 5678", "+66812345678"],
      [" 081 - 234 - 5678 ", "+66812345678"],
      ["0612345678", "+66612345678"],
      ["0912345678", "+66912345678"],
      ["+66812345678", "+66812345678"],
      ["+66 81 234 5678", "+66812345678"],
      ["+66-81-234-5678", "+66812345678"],
      ["+66 081-234-5678", "+66812345678"],
      ["021234567", "+6621234567"],
      ["02-123-4567", "+6621234567"],
      ["+66 2 123 4567", "+6621234567"],
      ["038-123-456", "+6638123456"],
      ["053123456", "+6653123456"],
      ["044 123 456", "+6644123456"],
      ["073123456", "+6673123456"],
    ];
    for (const [typed, e164] of accepted) {
      assert.equal(validateField("phone", withValues({ phone: typed })), undefined, typed);
      assert.equal(phoneToE164(typed), e164, typed);
    }
  });

  test("asks for a missing phone number in Thai", () => {
    assert.equal(validateField("phone", withValues({ phone: "  " })), "กรุณากรอกเบอร์โทรศัพท์");
  });

  test("rejects numbers that are not a Thai mobile or landline", () => {
    const rejected = [
      "081234567", // 9 digits starting 08: too short for a mobile
      "08123456789", // 11 digits
      "0712345678", // 10 digits starting 07: landlines have 9
      "0212345678", // 10 digits starting 02
      "011234567", // 01 is not a Thai prefix
      "0012345678",
      "12345678",
      "812345678", // missing the leading 0
      "66812345678", // country code without +
      "+1 415 555 0100", // not Thai
      "+66 8123 4567", // too short after +66
      "081.234.5678", // only spaces and dashes are separators
      "(02) 123-4567",
      "081-234-567a",
      "+66 81 234 5678 9",
    ];
    for (const typed of rejected) {
      assert.equal(
        validateField("phone", withValues({ phone: typed })),
        "กรุณากรอกเบอร์โทรศัพท์มือถือ 10 หลัก หรือเบอร์บ้าน 9 หลัก เช่น 081-234-5678",
        typed,
      );
      assert.equal(phoneToE164(typed), null, typed);
    }
  });

  test("formats a phone number as it is typed", () => {
    const steps: [typed: string, shown: string][] = [
      ["", ""],
      ["0", "0"],
      ["081", "081"],
      ["0812", "081-2"],
      ["081-", "081"], // a dangling dash disappears, so Backspace works
      ["081234", "081-234"],
      ["0812345", "081-234-5"],
      ["0812345678", "081-234-5678"],
      ["081 234 5678", "081-234-5678"],
      ["081.234.5678", "081-234-5678"],
      ["08123456789", "081-234-56789"], // extra digits are kept, never silently dropped
      ["021", "02-1"],
      ["021234567", "02-123-4567"],
      ["038123456", "038-123-456"],
      ["+", "+"],
      ["+66", "+66"],
      ["+668", "+66 8"],
      ["+66812345678", "+66 81-234-5678"],
      ["+66 081 234 5678", "+66 081-234-5678"],
      ["+6621234567", "+66 2-123-4567"],
      ["+6638123456", "+66 38-123-456"],
    ];
    for (const [typed, shown] of steps) {
      assert.equal(formatPhoneAsYouType(typed), shown, typed);
    }
  });

  test("formatted phone numbers are still valid input", () => {
    for (const typed of ["0812345678", "021234567", "038123456", "+66812345678", "+6621234567"]) {
      assert.equal(phoneToE164(formatPhoneAsYouType(typed)), phoneToE164(typed), typed);
    }
  });

  test("rejects phone input longer than the maximum length", () => {
    assert.ok(validateField("phone", withValues({ phone: `081-234-5678${" ".repeat(20)}` })));
  });
});

describe("Field validation: email", () => {
  test("accepts ordinary addresses, trimming the ends", () => {
    for (const email of [
      "somchai@example.com",
      "first.last+stem@school.ac.th",
      "A.B@Sub.Example.CO.TH",
      "o'neil_99@mail-host.org",
      "  wichai@gmail.com  ",
    ]) {
      assert.equal(validateField("email", withValues({ email })), undefined, email);
    }
  });

  test("asks for a missing email in Thai", () => {
    assert.equal(validateField("email", withValues({ email: " " })), "กรุณากรอกอีเมล");
  });

  test("catches common email typos", () => {
    for (const email of [
      "somchaigmail.com", // no @
      "somchai@gmail", // no top-level domain
      "somchai@gmail.", // trailing dot
      "somchai@gmail.c", // one-letter top-level domain
      "somchai@@gmail.com",
      "somchai@gmail..com",
      "somchai@.gmail.com",
      "somchai@gmail,com", // comma for dot
      "som chai@gmail.com", // space
      "somchai@gmail .com",
      ".somchai@gmail.com",
      "somchai.@gmail.com",
      "som..chai@gmail.com",
      "somchai@-gmail.com",
      "somchai@gmail-.com",
      "@gmail.com",
      "somchai@",
      "สมชาย@gmail.com",
    ]) {
      assert.equal(
        validateField("email", withValues({ email })),
        "กรุณากรอกอีเมลให้ถูกต้อง เช่น name@example.com",
        email,
      );
    }
  });

  test("rejects an email longer than the maximum length", () => {
    assert.ok(validateField("email", withValues({ email: `${"a".repeat(64)}@${"b".repeat(190)}.com` })));
  });
});

describe("Field validation: Attendee Role and organisation", () => {
  test("accepts each Attendee Role", () => {
    for (const role of attendeeRoles) {
      const form = withValues({ role, roleOther: "ศิษย์เก่า", organisation: "บริษัท ตัวอย่าง จำกัด" });
      assert.equal(validateField("role", form), undefined, role);
    }
  });

  test("requires an Attendee Role from the list", () => {
    for (const role of ["", "boss", "Parent"]) {
      assert.equal(validateField("role", withValues({ role })), "กรุณาเลือกฐานะการเข้าร่วมงาน", role);
    }
  });

  test('"Other" requires the Attendee to type their role', () => {
    assert.equal(
      validateField("roleOther", withValues({ role: "other", roleOther: "  " })),
      "กรุณาระบุฐานะการเข้าร่วมงาน",
    );
    assert.equal(validateField("roleOther", withValues({ role: "other", roleOther: "ศิษย์เก่า" })), undefined);
    assert.equal(validateField("roleOther", withValues({ role: "parent", roleOther: "" })), undefined);
    assert.ok(validateField("roleOther", withValues({ role: "other", roleOther: "ก".repeat(101) })));
  });

  test("organisation is optional, except for a Sponsor", () => {
    assert.equal(validateField("organisation", withValues({ role: "teacher", organisation: "" })), undefined);
    assert.equal(
      validateField("organisation", withValues({ role: "sponsor", organisation: " " })),
      "กรุณาระบุบริษัท / องค์กรที่ท่านเป็นตัวแทน",
    );
    assert.equal(
      validateField("organisation", withValues({ role: "sponsor", organisation: "บริษัท ตัวอย่าง จำกัด" })),
      undefined,
    );
    assert.ok(validateField("organisation", withValues({ role: "student", organisation: "ก".repeat(201) })));
  });

  test("the organisation field is relabelled for a Sponsor", () => {
    assert.equal(organisationLabel("sponsor"), "บริษัท / องค์กรที่ท่านเป็นตัวแทน");
    assert.equal(organisationLabel("parent"), "ชื่อโรงเรียน / สถาบันการศึกษา / บริษัท / หน่วยงาน");
    assert.equal(organisationLabel(""), "ชื่อโรงเรียน / สถาบันการศึกษา / บริษัท / หน่วยงาน");
  });
});

describe("Field validation: Event Days and Referral Sources", () => {
  test("accepts one or both Event Days", () => {
    for (const eventDays of [["2026-10-31"], ["2026-11-01"], ["2026-10-31", "2026-11-01"]]) {
      assert.equal(validateField("eventDays", withValues({ eventDays })), undefined, eventDays.join());
    }
  });

  test("requires at least one Event Day", () => {
    assert.equal(
      validateField("eventDays", withValues({ eventDays: [] })),
      "กรุณาเลือกวันที่ต้องการเข้าร่วมงานอย่างน้อย 1 วัน",
    );
  });

  test("rejects a day that is not an Event Day", () => {
    assert.equal(
      validateField("eventDays", withValues({ eventDays: ["2026-10-31", "2026-11-02"] })),
      "กรุณาเลือกวันที่ต้องการเข้าร่วมงานจากรายการ",
    );
  });

  test("accepts any combination of Referral Sources", () => {
    const form = withValues({ referralSources: [...referralSources], referralOther: "วิทยุ" });
    assert.equal(validateField("referralSources", form), undefined);
  });

  test("requires at least one Referral Source from the list", () => {
    assert.equal(
      validateField("referralSources", withValues({ referralSources: [] })),
      "กรุณาเลือกช่องทางที่ทราบข่าวอย่างน้อย 1 ช่องทาง",
    );
    assert.equal(
      validateField("referralSources", withValues({ referralSources: ["line", "myspace"] })),
      "กรุณาเลือกช่องทางที่ทราบข่าวจากรายการ",
    );
  });

  test('"Other" Referral Source requires text', () => {
    assert.equal(
      validateField("referralOther", withValues({ referralSources: ["line", "other"], referralOther: "" })),
      "กรุณาระบุช่องทางที่ทราบข่าว",
    );
    assert.equal(
      validateField("referralOther", withValues({ referralSources: ["other"], referralOther: "วิทยุ" })),
      undefined,
    );
    assert.equal(validateField("referralOther", withValues({ referralSources: ["line"], referralOther: "" })), undefined);
  });
});

describe("Field validation: optional free text", () => {
  test("the Competing Team, accessibility needs and comments may be left empty", () => {
    for (const field of ["competingTeamCheeredFor", "accessibilityNeeds", "comments"] as const) {
      assert.equal(validateField(field, withValues({ [field]: "" })), undefined, field);
      assert.equal(validateField(field, withValues({ [field]: "ทีม Thunder ⚡ (รร. ตัวอย่าง)" })), undefined, field);
    }
  });

  test("every free-text field has a maximum length", () => {
    const limits = {
      competingTeamCheeredFor: 200,
      accessibilityNeeds: 1000,
      comments: 1000,
      referralOther: 100,
    } as const;
    for (const [field, limit] of Object.entries(limits) as [keyof typeof limits, number][]) {
      const form = withValues({ referralSources: ["other"], [field]: "ก".repeat(limit + 1) });
      assert.equal(validateField(field, form), `ข้อความยาวได้ไม่เกิน ${limit} ตัวอักษร`, field);
      assert.equal(validateField(field, { ...form, [field]: "ก".repeat(limit) }), undefined, field);
      assert.equal(maxLengths[field], limit, field);
    }
  });
});

describe("Field validation: the whole form", () => {
  test("a complete form has no errors", () => {
    assert.deepEqual(validateRegistration(valid), {});
  });

  test("an empty form reports each required field, in form order", () => {
    assert.deepEqual(validateRegistration(emptyRegistrationForm), {
      givenName: "กรุณากรอกชื่อ",
      familyName: "กรุณากรอกนามสกุล",
      phone: "กรุณากรอกเบอร์โทรศัพท์",
      email: "กรุณากรอกอีเมล",
      role: "กรุณาเลือกฐานะการเข้าร่วมงาน",
      eventDays: "กรุณาเลือกวันที่ต้องการเข้าร่วมงานอย่างน้อย 1 วัน",
      referralSources: "กรุณาเลือกช่องทางที่ทราบข่าวอย่างน้อย 1 ช่องทาง",
    });
  });

  test("parsing normalises what is stored", () => {
    const result = parseRegistration({
      givenName: "  วิชัย ",
      familyName: "ใจดี",
      phone: "+66 81-234-5678",
      email: " Wichai@Example.com ",
      role: "parent",
      roleOther: "ignored unless Other",
      organisation: "  ",
      eventDays: ["2026-11-01", "2026-10-31", "2026-11-01"],
      referralSources: ["line", "facebook", "line"],
      referralOther: "ignored unless Other",
      competingTeamCheeredFor: " Thunder ",
      accessibilityNeeds: "",
      comments: "  ",
    });

    assert.deepEqual(result, {
      ok: true,
      registration: {
        givenName: "วิชัย",
        familyName: "ใจดี",
        phone: "+66812345678",
        email: "Wichai@Example.com",
        role: "parent",
        roleOther: null,
        organisation: null,
        eventDays: ["2026-10-31", "2026-11-01"],
        referralSources: ["facebook", "line"],
        referralOther: null,
        competingTeamCheeredFor: "Thunder",
        accessibilityNeeds: null,
        comments: null,
      },
    });
  });

  test("parsing keeps the Other texts only when Other is chosen", () => {
    const result = parseRegistration({
      ...valid,
      role: "other",
      roleOther: " ศิษย์เก่า ",
      referralSources: ["other"],
      referralOther: " วิทยุ ",
    });

    assert.ok(result.ok);
    assert.equal(result.registration.roleOther, "ศิษย์เก่า");
    assert.equal(result.registration.referralOther, "วิทยุ");
  });

  test("parsing an invalid form returns its errors", () => {
    assert.deepEqual(parseRegistration({ ...valid, role: "sponsor", organisation: "" }), {
      ok: false,
      fieldErrors: { organisation: "กรุณาระบุบริษัท / องค์กรที่ท่านเป็นตัวแทน" },
    });
  });

  test("reads a submitted form, treating missing fields as empty", () => {
    const formData = new FormData();
    formData.set("givenName", "วิชัย");
    formData.set("phone", "081-234-5678");
    formData.append("eventDays", "2026-10-31");
    formData.append("eventDays", "2026-11-01");
    formData.append("referralSources", "line");
    formData.set("$ACTION_ID_abc", "");

    assert.deepEqual(registrationFormFromFormData(formData), {
      ...emptyRegistrationForm,
      givenName: "วิชัย",
      phone: "081-234-5678",
      eventDays: ["2026-10-31", "2026-11-01"],
      referralSources: ["line"],
    });
  });
});
