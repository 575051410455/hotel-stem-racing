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
  comments: "",
  pdpaAcknowledged: true,
};

const withValues = (values: Partial<RegistrationForm>): RegistrationForm => ({ ...valid, ...values });

describe("Field validation: names", () => {
  test("accepts Thai names with vowels and tone marks", () => {
    for (const name of ["วิชัย", "สมศักดิ์", "ณัฐพงศ์", "ไอยรา", "นิ่มนวล", "เจ๊ะ", "ปู"]) {
      assert.equal(validateField("givenName", withValues({ givenName: name }), "th"), undefined, name);
      assert.equal(validateField("familyName", withValues({ familyName: name }), "th"), undefined, name);
    }
  });

  test("accepts groups joined by a single space, apostrophe or hyphen, and trims the ends", () => {
    for (const name of ["Mary Ann", "O'Brien", "O’Brien", "Jean-Luc", "ณ อยุธยา", "  วิชัย  "]) {
      assert.equal(validateField("givenName", withValues({ givenName: name }), "th"), undefined, name);
    }
  });

  test("ignores invisible zero-width characters pasted inside a name, and saves the name without them", () => {
    const pasted = "ณัฐ​พล‌";
    assert.equal(validateField("givenName", withValues({ givenName: pasted }), "th"), undefined);

    const parsed = parseRegistration(withValues({ givenName: pasted, familyName: "﻿ใจดี" }), "th");
    assert.ok(parsed.ok);
    assert.equal(parsed.registration.givenName, "ณัฐพล");
    assert.equal(parsed.registration.familyName, "ใจดี");
  });

  test("asks for a missing name in Thai", () => {
    assert.equal(validateField("givenName", withValues({ givenName: "   " }), "th"), "กรุณากรอกชื่อ");
    assert.equal(validateField("familyName", withValues({ familyName: "" }), "th"), "กรุณากรอกนามสกุล");
  });

  test("rejects digits, symbols, emoji and doubled or dangling separators", () => {
    for (const name of ["J1m", "Ann!", "😀😀", "Mary  Ann", "-Ann", "Ann-", "Jean--Luc", "O''Brien", "ชัย.", "a_b"]) {
      assert.match(validateField("givenName", withValues({ givenName: name }), "th") ?? "", /^ชื่อใช้ได้เฉพาะตัวอักษร/, name);
    }
  });

  test("rejects names shorter than two letters", () => {
    for (const name of ["ก", "A"]) {
      assert.equal(
        validateField("familyName", withValues({ familyName: name }), "th"),
        "นามสกุลต้องมีอย่างน้อย 2 ตัวอักษร",
        name,
      );
    }
  });

  test("rejects names longer than the maximum length", () => {
    assert.equal(
      validateField("givenName", withValues({ givenName: "ก".repeat(101) }), "th"),
      "ชื่อยาวได้ไม่เกิน 100 ตัวอักษร",
    );
    assert.equal(validateField("givenName", withValues({ givenName: "ก".repeat(100) }), "th"), undefined);
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
      assert.equal(validateField("phone", withValues({ phone: typed }), "th"), undefined, typed);
      assert.equal(phoneToE164(typed), e164, typed);
    }
  });

  test("asks for a missing phone number in Thai", () => {
    assert.equal(validateField("phone", withValues({ phone: "  " }), "th"), "กรุณากรอกเบอร์โทรศัพท์");
  });

  test("rejects numbers that are neither a Thai number nor an international one", () => {
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
      "447700900123", // a foreign number needs its +
      "+66 8123 4567", // too short after +66
      "081.234.5678", // only spaces and dashes are separators
      "(02) 123-4567",
      "081-234-567a",
      "+66 81 234 5678 9",
    ];
    for (const typed of rejected) {
      assert.equal(
        validateField("phone", withValues({ phone: typed }), "th"),
        "กรุณากรอกเบอร์มือถือ 10 หลัก หรือเบอร์บ้าน 9 หลัก เช่น 081-234-5678 หรือเบอร์ต่างประเทศขึ้นต้นด้วย + เช่น +44 7700 900123",
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
      // International numbers stay as typed, apart from characters other than digits, spaces and hyphens.
      ["+4", "+4"],
      ["+44 7700 900123", "+44 7700 900123"],
      ["+1 415-555-0100", "+1 415-555-0100"],
      ["+1 (415) 555.0100", "+1 415 5550100"],
    ];
    for (const [typed, shown] of steps) {
      assert.equal(formatPhoneAsYouType(typed), shown, typed);
    }
  });

  test("formatted phone numbers are still valid input", () => {
    for (const typed of ["0812345678", "021234567", "038123456", "+66812345678", "+6621234567", "+44 7700 900123"]) {
      assert.equal(phoneToE164(formatPhoneAsYouType(typed)), phoneToE164(typed), typed);
    }
  });

  test("accepts an international number, + and a country code other than 66, and stores it as E.164", () => {
    const accepted: [typed: string, e164: string][] = [
      ["+44 7700 900123", "+447700900123"],
      ["+447700900123", "+447700900123"],
      ["+1 415 555 0100", "+14155550100"],
      ["+81-90-1234-5678", "+819012345678"],
      [" +65 8123 4567 ", "+6581234567"],
      ["+12345678", "+12345678"], // 8 digits in all, the shortest accepted
      ["+123456789012345", "+123456789012345"], // 15, the E.164 maximum
    ];
    for (const [typed, e164] of accepted) {
      assert.equal(validateField("phone", withValues({ phone: typed }), "th"), undefined, typed);
      assert.equal(phoneToE164(typed), e164, typed);
    }
  });

  test("rejects an international number that is too short, too long or has no country code", () => {
    for (const typed of ["+1234567", "+44 1234", "+1234567890123456", "+0 812 345 678", "+44 7700 900123x"]) {
      assert.equal(phoneToE164(typed), null, typed);
      assert.equal(
        validateField("phone", withValues({ phone: typed }), "en"),
        "Enter a 10-digit Thai mobile or 9-digit landline number, such as 081-234-5678, or an international number starting with +, such as +44 7700 900123",
        typed,
      );
    }
  });

  test("rejects phone input longer than the maximum length", () => {
    assert.ok(validateField("phone", withValues({ phone: `081-234-5678${" ".repeat(20)}` }), "th"));
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
      assert.equal(validateField("email", withValues({ email }), "th"), undefined, email);
    }
  });

  test("asks for a missing email in Thai", () => {
    assert.equal(validateField("email", withValues({ email: " " }), "th"), "กรุณากรอกอีเมล");
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
        validateField("email", withValues({ email }), "th"),
        "กรุณากรอกอีเมลให้ถูกต้อง เช่น name@example.com",
        email,
      );
    }
  });

  test("rejects an email longer than the maximum length", () => {
    assert.ok(validateField("email", withValues({ email: `${"a".repeat(64)}@${"b".repeat(190)}.com` }), "th"));
  });
});

describe("Field validation: Attendee Role and organisation", () => {
  test("accepts each Attendee Role", () => {
    for (const role of attendeeRoles) {
      const form = withValues({ role, roleOther: "ศิษย์เก่า", organisation: "บริษัท ตัวอย่าง จำกัด" });
      assert.equal(validateField("role", form, "th"), undefined, role);
    }
  });

  test("requires an Attendee Role from the list", () => {
    for (const role of ["", "boss", "Parent"]) {
      assert.equal(validateField("role", withValues({ role }), "th"), "กรุณาเลือกฐานะการเข้าร่วมงาน", role);
    }
  });

  test('"Other" requires the Attendee to type their role', () => {
    assert.equal(
      validateField("roleOther", withValues({ role: "other", roleOther: "  " }), "th"),
      "กรุณาระบุฐานะการเข้าร่วมงาน",
    );
    assert.equal(validateField("roleOther", withValues({ role: "other", roleOther: "ศิษย์เก่า" }), "th"), undefined);
    assert.equal(validateField("roleOther", withValues({ role: "parent", roleOther: "" }), "th"), undefined);
    assert.ok(validateField("roleOther", withValues({ role: "other", roleOther: "ก".repeat(101) }), "th"));
  });

  test("organisation is optional, except for a Sponsor", () => {
    assert.equal(validateField("organisation", withValues({ role: "teacher", organisation: "" }), "th"), undefined);
    assert.equal(
      validateField("organisation", withValues({ role: "sponsor", organisation: " " }), "th"),
      "กรุณาระบุบริษัท / องค์กรที่ท่านเป็นตัวแทน",
    );
    assert.equal(
      validateField("organisation", withValues({ role: "sponsor", organisation: "บริษัท ตัวอย่าง จำกัด" }), "th"),
      undefined,
    );
    assert.ok(validateField("organisation", withValues({ role: "student", organisation: "ก".repeat(201) }), "th"));
  });

  test("the organisation field is relabelled for a Sponsor", () => {
    assert.equal(organisationLabel("sponsor", "th"), "บริษัท / องค์กรที่ท่านเป็นตัวแทน");
    assert.equal(organisationLabel("parent", "th"), "ชื่อโรงเรียน / สถาบันการศึกษา / บริษัท / หน่วยงาน");
    assert.equal(organisationLabel("", "th"), "ชื่อโรงเรียน / สถาบันการศึกษา / บริษัท / หน่วยงาน");
  });
});

describe("Field validation: Event Days and Referral Sources", () => {
  test("accepts one or more of the three Event Days", () => {
    for (const eventDays of [["2026-10-30"], ["2026-10-31"], ["2026-11-01"], ["2026-10-31", "2026-11-01"], ["2026-10-30", "2026-10-31", "2026-11-01"]]) {
      assert.equal(validateField("eventDays", withValues({ eventDays }), "th"), undefined, eventDays.join());
    }
  });

  test("requires at least one Event Day", () => {
    assert.equal(
      validateField("eventDays", withValues({ eventDays: [] }), "th"),
      "กรุณาเลือกวันที่ต้องการเข้าร่วมงานอย่างน้อย 1 วัน",
    );
  });

  test("rejects a day that is not an Event Day", () => {
    assert.equal(
      validateField("eventDays", withValues({ eventDays: ["2026-10-31", "2026-11-02"] }), "th"),
      "กรุณาเลือกวันที่ต้องการเข้าร่วมงานจากรายการ",
    );
  });

  test("accepts any combination of Referral Sources", () => {
    const form = withValues({ referralSources: [...referralSources], referralOther: "วิทยุ" });
    assert.equal(validateField("referralSources", form, "th"), undefined);
  });

  test("requires at least one Referral Source from the list", () => {
    assert.equal(
      validateField("referralSources", withValues({ referralSources: [] }), "th"),
      "กรุณาเลือกช่องทางที่ทราบข่าวอย่างน้อย 1 ช่องทาง",
    );
    assert.equal(
      validateField("referralSources", withValues({ referralSources: ["line", "myspace"] }), "th"),
      "กรุณาเลือกช่องทางที่ทราบข่าวจากรายการ",
    );
  });

  test('"Other" Referral Source requires text', () => {
    assert.equal(
      validateField("referralOther", withValues({ referralSources: ["line", "other"], referralOther: "" }), "th"),
      "กรุณาระบุช่องทางที่ทราบข่าว",
    );
    assert.equal(
      validateField("referralOther", withValues({ referralSources: ["other"], referralOther: "วิทยุ" }), "th"),
      undefined,
    );
    assert.equal(validateField("referralOther", withValues({ referralSources: ["line"], referralOther: "" }), "th"), undefined);
  });
});

describe("Field validation: optional free text", () => {
  test("the Competing Team and comments may be left empty", () => {
    for (const field of ["competingTeamCheeredFor", "comments"] as const) {
      assert.equal(validateField(field, withValues({ [field]: "" }), "th"), undefined, field);
      assert.equal(validateField(field, withValues({ [field]: "ทีม Thunder ⚡ (รร. ตัวอย่าง)" }), "th"), undefined, field);
    }
  });

  test("every free-text field has a maximum length", () => {
    const limits = {
      competingTeamCheeredFor: 200,
      comments: 1000,
      referralOther: 100,
    } as const;
    for (const [field, limit] of Object.entries(limits) as [keyof typeof limits, number][]) {
      const form = withValues({ referralSources: ["other"], [field]: "ก".repeat(limit + 1) });
      assert.equal(validateField(field, form, "th"), `ข้อความยาวได้ไม่เกิน ${limit} ตัวอักษร`, field);
      assert.equal(validateField(field, { ...form, [field]: "ก".repeat(limit) }, "th"), undefined, field);
      assert.equal(maxLengths[field], limit, field);
    }
  });
});

describe("Field validation: the whole form", () => {
  test("a complete form has no errors", () => {
    assert.deepEqual(validateRegistration(valid, "th"), {});
  });

  test("an empty form reports each required field, in form order", () => {
    const errors = validateRegistration(emptyRegistrationForm, "th");
    // deepEqual ignores key order, so check the order on its own.
    assert.deepEqual(Object.keys(errors), [
      "givenName",
      "familyName",
      "phone",
      "email",
      "role",
      "eventDays",
      "referralSources",
      "pdpaAcknowledged",
    ]);
    assert.deepEqual(errors, {
      givenName: "กรุณากรอกชื่อ",
      familyName: "กรุณากรอกนามสกุล",
      phone: "กรุณากรอกเบอร์โทรศัพท์",
      email: "กรุณากรอกอีเมล",
      role: "กรุณาเลือกฐานะการเข้าร่วมงาน",
      eventDays: "กรุณาเลือกวันที่ต้องการเข้าร่วมงานอย่างน้อย 1 วัน",
      referralSources: "กรุณาเลือกช่องทางที่ทราบข่าวอย่างน้อย 1 ช่องทาง",
      pdpaAcknowledged: "กรุณารับทราบนโยบายคุ้มครองข้อมูลส่วนบุคคลก่อนลงทะเบียน",
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
      comments: "  ",
      pdpaAcknowledged: true,
    }, "th");

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
    }, "th");

    assert.ok(result.ok);
    assert.equal(result.registration.roleOther, "ศิษย์เก่า");
    assert.equal(result.registration.referralOther, "วิทยุ");
  });

  test("parsing an invalid form returns its errors", () => {
    assert.deepEqual(parseRegistration({ ...valid, role: "sponsor", organisation: "" }, "th"), {
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
    formData.set("accessibilityNeeds", "legacy field must be ignored");
    formData.set("$ACTION_ID_abc", "");

    assert.deepEqual(registrationFormFromFormData(formData), {
      ...emptyRegistrationForm,
      givenName: "วิชัย",
      phone: "081-234-5678",
      eventDays: ["2026-10-31", "2026-11-01"],
      referralSources: ["line"],
    });
  });

  test("accepts only one checked PDPA acknowledgment value from FormData", () => {
    const formData = new FormData();
    formData.set("pdpaAcknowledged", "yes");
    assert.equal(registrationFormFromFormData(formData).pdpaAcknowledged, true);
    formData.append("pdpaAcknowledged", "yes");
    assert.equal(registrationFormFromFormData(formData).pdpaAcknowledged, false);
    formData.set("pdpaAcknowledged", "on");
    assert.equal(registrationFormFromFormData(formData).pdpaAcknowledged, false);
  });
});

// English messages are copied from .scratch/thai-english/copy-public.md ("Validation messages").
describe("Field validation: messages in English", () => {
  test("an empty form reports each required field in English, in form order", () => {
    assert.deepEqual(validateRegistration(emptyRegistrationForm, "en"), {
      givenName: "Please enter your given name",
      familyName: "Please enter your family name",
      phone: "Please enter your phone number",
      email: "Please enter your email",
      role: "Please choose how you're attending",
      eventDays: "Please choose at least one day",
      referralSources: "Please choose at least one way you heard about the Event",
      pdpaAcknowledged: "Please acknowledge the Personal Data Protection Policy before registering",
    });
  });

  test("name problems name the field in English", () => {
    assert.equal(
      validateField("givenName", withValues({ givenName: "ก".repeat(101) }), "en"),
      "Your given name can be at most 100 characters",
    );
    assert.equal(
      validateField("familyName", withValues({ familyName: "Smith2" }), "en"),
      "Your family name can use letters only, with a single space, hyphen (-) or apostrophe (') between words",
    );
    assert.equal(validateField("givenName", withValues({ givenName: "J" }), "en"), "Your given name needs at least 2 letters");
  });

  test("phone, email and free-text problems in English", () => {
    assert.equal(
      validateField("phone", withValues({ phone: "12345" }), "en"),
      "Enter a 10-digit Thai mobile or 9-digit landline number, such as 081-234-5678, or an international number starting with +, such as +44 7700 900123",
    );
    assert.equal(
      validateField("email", withValues({ email: "name@example" }), "en"),
      "Please enter a valid email, such as name@example.com",
    );
    assert.equal(
      validateField("comments", withValues({ comments: "a".repeat(1001) }), "en"),
      "This can be at most 1000 characters",
    );
  });

  test("Attendee Role, organisation, Event Day and Referral Source problems in English", () => {
    assert.equal(
      validateField("roleOther", withValues({ role: "other", roleOther: "" }), "en"),
      "Please specify how you're attending",
    );
    assert.equal(
      validateField("organisation", withValues({ role: "sponsor", organisation: "" }), "en"),
      "Please give the company or organisation you represent",
    );
    assert.equal(
      validateField("eventDays", withValues({ eventDays: ["2026-11-02"] }), "en"),
      "Please choose a day from the list",
    );
    assert.equal(
      validateField("referralSources", withValues({ referralSources: ["radio"] }), "en"),
      "Please choose from the list",
    );
    assert.equal(
      validateField("referralOther", withValues({ referralSources: ["other"], referralOther: "" }), "en"),
      "Please specify where you heard about the Event",
    );
  });

  test("the organisation label for each Attendee Role, in Thai and in English", () => {
    const school = { th: "ชื่อโรงเรียน / สถาบันการศึกษา / บริษัท / หน่วยงาน", en: "School, university, company or organisation" };
    const expected = {
      parent: school,
      teacher: school,
      student: school,
      sponsor: { th: "บริษัท / องค์กรที่ท่านเป็นตัวแทน", en: "Company or organisation you represent" },
      other: school,
    };
    assert.deepEqual(attendeeRoles, Object.keys(expected), "every Attendee Role has an expected label");
    for (const role of attendeeRoles) {
      assert.equal(organisationLabel(role, "th"), expected[role].th, role);
      assert.equal(organisationLabel(role, "en"), expected[role].en, role);
    }
    assert.equal(organisationLabel("", "en"), school.en, "no role chosen yet");
  });

  test("parsing an invalid English form returns English errors", () => {
    assert.deepEqual(parseRegistration(withValues({ email: "" }), "en"), {
      ok: false,
      fieldErrors: { email: "Please enter your email" },
    });
  });
});
