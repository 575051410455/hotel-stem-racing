// Registration fields: options, limits and the pure Field validation shared by the browser
// (as the Attendee types) and the server (before anything is saved). Safe to import anywhere.

import { event } from "@/lib/event";

/** What the Attendee entered, as the form holds it and FormData carries it. */
export type RegistrationForm = {
  givenName: string;
  familyName: string;
  phone: string;
  email: string;
  role: string;
  roleOther: string;
  organisation: string;
  eventDays: string[];
  referralSources: string[];
  referralOther: string;
  competingTeamCheeredFor: string;
  accessibilityNeeds: string;
  comments: string;
};

export type FieldName = keyof RegistrationForm;

/** Fields in the order the form shows them; errors are reported (and focused) in this order. */
export const fieldOrder = [
  "givenName",
  "familyName",
  "phone",
  "email",
  "role",
  "roleOther",
  "organisation",
  "eventDays",
  "referralSources",
  "referralOther",
  "competingTeamCheeredFor",
  "accessibilityNeeds",
  "comments",
] as const satisfies readonly FieldName[];

const multiValueFields = ["eventDays", "referralSources"] as const;
type MultiValueField = (typeof multiValueFields)[number];
const isMultiValueField = (field: FieldName): field is MultiValueField =>
  (multiValueFields as readonly string[]).includes(field);

export const emptyRegistrationForm: RegistrationForm = {
  givenName: "",
  familyName: "",
  phone: "",
  email: "",
  role: "",
  roleOther: "",
  organisation: "",
  eventDays: [],
  referralSources: [],
  referralOther: "",
  competingTeamCheeredFor: "",
  accessibilityNeeds: "",
  comments: "",
};

// ---- Options (labels are the organisers' canonical Thai copy) ----

export const attendeeRoles = ["parent", "teacher", "student", "sponsor", "other"] as const;
export type AttendeeRole = (typeof attendeeRoles)[number];

export const attendeeRoleLabels: Record<AttendeeRole, string> = {
  parent: "ผู้ปกครอง",
  teacher: "คุณครู / อาจารย์",
  student: "นักเรียน / นักศึกษา",
  sponsor: "สปอนเซอร์ / ผู้สนับสนุน",
  other: "อื่น ๆ โปรดระบุ",
};

const isAttendeeRole = (value: string): value is AttendeeRole =>
  (attendeeRoles as readonly string[]).includes(value);

export const referralSources = [
  "facebook",
  "instagram",
  "tiktok",
  "line",
  "website",
  "school",
  "organisation",
  "friend",
  "competing_team",
  "other",
] as const;
export type ReferralSource = (typeof referralSources)[number];

export const referralSourceLabels: Record<ReferralSource, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  line: "LINE",
  website: "เว็บไซต์",
  school: "โรงเรียน / สถาบันการศึกษา",
  organisation: "บริษัท / หน่วยงาน",
  friend: "เพื่อน / คนรู้จัก",
  competing_team: "ทีมที่เข้าร่วมการแข่งขัน",
  other: "อื่น ๆ โปรดระบุ",
};

const isReferralSource = (value: string): value is ReferralSource =>
  (referralSources as readonly string[]).includes(value);

const eventDayDates: readonly string[] = event.eventDays.map((day) => day.date);

/** Field 5 merges the original form's questions 5 and 6: Sponsors are asked whom they represent. */
export function organisationLabel(role: string): string {
  return role === "sponsor"
    ? "บริษัท / องค์กรที่ท่านเป็นตัวแทน"
    : "ชื่อโรงเรียน / สถาบันการศึกษา / บริษัท / หน่วยงาน";
}

/** Thai messages keyed by field; empty when every field is valid. */
export type FieldErrors = Partial<Record<FieldName, string>>;

export const maxLengths = {
  givenName: 100,
  familyName: 100,
  phone: 20,
  email: 254,
  roleOther: 100,
  organisation: 200,
  referralOther: 100,
  competingTeamCheeredFor: 200,
  accessibilityNeeds: 1000,
  comments: 1000,
} as const satisfies Partial<Record<FieldName, number>>;

// ---- Names ----

// Letter-or-mark groups joined by one space, apostrophe (typed or smart) or hyphen.
// Marks matter: Thai vowels and tone marks such as ิ ั ่ are combining marks, not letters.
const NAME_PATTERN = /^[\p{L}\p{M}]+(?:[ '’-][\p{L}\p{M}]+)*$/u;

// Zero-width space/non-joiner/joiner, word joiner and BOM: invisible, and common in Thai text
// pasted from LINE or the web, where they mark word breaks.
const INVISIBLE_CHARACTERS = /[\u200B-\u200D\u2060\uFEFF]/g;

/** A name as entered, without invisible characters, trimmed and NFC-normalised. */
function cleanName(raw: string): string {
  return raw.replace(INVISIBLE_CHARACTERS, "").trim().normalize("NFC");
}
const NAME_CHARACTER = /[\p{L}\p{M}]/gu;

function validateName(raw: string, label: "ชื่อ" | "นามสกุล", maxLength: number) {
  const value = cleanName(raw);
  if (!value) return `กรุณากรอก${label}`;
  if (value.length > maxLength) return `${label}ยาวได้ไม่เกิน ${maxLength} ตัวอักษร`;
  if (!NAME_PATTERN.test(value)) {
    return `${label}ใช้ได้เฉพาะตัวอักษร คั่นคำด้วยเว้นวรรค ขีด (-) หรือ ' ได้ครั้งละ 1 ตัว`;
  }
  if ((value.match(NAME_CHARACTER) ?? []).length < 2) return `${label}ต้องมีอย่างน้อย 2 ตัวอักษร`;
  return undefined;
}

// ---- Phone ----

const MOBILE = /^0[689]\d{8}$/; // 10 digits, 06 / 08 / 09
const LANDLINE = /^0[2-7]\d{7}$/; // 9 digits, 02–07

/** The Thai national number ("0812345678") for spaces, dashes and an optional +66 prefix. */
function nationalNumber(raw: string): string | null {
  const compact = raw.replace(/[\s-]+/g, "");
  if (compact.startsWith("+66")) {
    const rest = compact.slice(3);
    // "+66 081-…" is a common slip: the trunk 0 kept after the country code.
    return /^\d+$/.test(rest) ? (rest.startsWith("0") ? rest : `0${rest}`) : null;
  }
  return /^\d+$/.test(compact) ? compact : null;
}

/** E.164 form ("+66812345678") of a valid Thai mobile or landline number, otherwise null. */
export function phoneToE164(raw: string): string | null {
  const national = nationalNumber(raw);
  if (!national || !(MOBILE.test(national) || LANDLINE.test(national))) return null;
  return `+66${national.slice(1)}`;
}

/** Digits split into dash-joined groups; the last group keeps any extra digits. */
function groupDigits(digits: string, sizes: readonly number[]): string {
  const groups: string[] = [];
  let start = 0;
  sizes.forEach((size, index) => {
    if (start >= digits.length) return;
    const isLast = index === sizes.length - 1;
    groups.push(digits.slice(start, isLast ? undefined : start + size));
    start += size;
  });
  return groups.join("-");
}

/** Groups for a national number with its leading 0: 02-123-4567, 081-234-5678, 038-123-456. */
function nationalGroups(national: string) {
  if (national.startsWith("02")) return [2, 3, 4];
  if (/^0[3-57]/.test(national)) return [3, 3, 3];
  return [3, 3, 4];
}

/** Groups after +66 without the trunk 0: 2-123-4567, 81-234-5678, 38-123-456. */
function subscriberGroups(subscriber: string) {
  if (subscriber.startsWith("2")) return [1, 3, 4];
  if (/^[3-57]/.test(subscriber)) return [2, 3, 3];
  return [2, 3, 4];
}

/**
 * Display form while typing ("0812345678" → "081-234-5678", "+66812345678" → "+66 81-234-5678").
 * Keeps only digits and a leading +, adds no dangling dash, and never drops digits.
 */
export function formatPhoneAsYouType(raw: string): string {
  const international = raw.trimStart().startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (!international) return groupDigits(digits, nationalGroups(digits));
  if (!digits.startsWith("66") || digits.length === 2) return `+${digits}`;
  const rest = digits.slice(2);
  return `+66 ${groupDigits(rest, rest.startsWith("0") ? nationalGroups(rest) : subscriberGroups(rest))}`;
}

function validatePhone(raw: string) {
  if (!raw.trim()) return "กรุณากรอกเบอร์โทรศัพท์";
  if (raw.length > maxLengths.phone || !phoneToE164(raw)) {
    return "กรุณากรอกเบอร์โทรศัพท์มือถือ 10 หลัก หรือเบอร์บ้าน 9 หลัก เช่น 081-234-5678";
  }
  return undefined;
}

// ---- Email ----

// A dot-atom local part, then dot-separated domain labels ending in a letters-only
// top-level domain of 2+ characters. Catches missing @, doubled dots, commas and spaces.
const EMAIL_PATTERN =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;

function validateEmail(raw: string) {
  const value = raw.trim();
  if (!value) return "กรุณากรอกอีเมล";
  if (value.length > maxLengths.email || !EMAIL_PATTERN.test(value)) {
    return "กรุณากรอกอีเมลให้ถูกต้อง เช่น name@example.com";
  }
  return undefined;
}

// ---- Free text ----

const tooLong = (maxLength: number) => `ข้อความยาวได้ไม่เกิน ${maxLength} ตัวอักษร`;

function validateText(raw: string, maxLength: number, missing?: string) {
  const value = raw.trim();
  if (!value) return missing;
  return value.length > maxLength ? tooLong(maxLength) : undefined;
}

// ---- Validation ----

export function validateField(field: FieldName, form: RegistrationForm): string | undefined {
  switch (field) {
    case "givenName":
      return validateName(form.givenName, "ชื่อ", maxLengths.givenName);
    case "familyName":
      return validateName(form.familyName, "นามสกุล", maxLengths.familyName);
    case "phone":
      return validatePhone(form.phone);
    case "email":
      return validateEmail(form.email);
    case "role":
      return isAttendeeRole(form.role) ? undefined : "กรุณาเลือกฐานะการเข้าร่วมงาน";
    case "roleOther":
      return form.role === "other"
        ? validateText(form.roleOther, maxLengths.roleOther, "กรุณาระบุฐานะการเข้าร่วมงาน")
        : undefined;
    case "organisation":
      return validateText(
        form.organisation,
        maxLengths.organisation,
        form.role === "sponsor" ? "กรุณาระบุบริษัท / องค์กรที่ท่านเป็นตัวแทน" : undefined,
      );
    case "eventDays":
      if (form.eventDays.length === 0) return "กรุณาเลือกวันที่ต้องการเข้าร่วมงานอย่างน้อย 1 วัน";
      return form.eventDays.every((day) => eventDayDates.includes(day))
        ? undefined
        : "กรุณาเลือกวันที่ต้องการเข้าร่วมงานจากรายการ";
    case "referralSources":
      if (form.referralSources.length === 0) return "กรุณาเลือกช่องทางที่ทราบข่าวอย่างน้อย 1 ช่องทาง";
      return form.referralSources.every(isReferralSource)
        ? undefined
        : "กรุณาเลือกช่องทางที่ทราบข่าวจากรายการ";
    case "referralOther":
      return form.referralSources.includes("other")
        ? validateText(form.referralOther, maxLengths.referralOther, "กรุณาระบุช่องทางที่ทราบข่าว")
        : undefined;
    case "competingTeamCheeredFor":
    case "accessibilityNeeds":
    case "comments":
      return validateText(form[field], maxLengths[field]);
  }
}

/** Every field's Thai message, in form order; `{}` when the form is valid. */
export function validateRegistration(form: RegistrationForm): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of fieldOrder) {
    const error = validateField(field, form);
    if (error) errors[field] = error;
  }
  return errors;
}

// ---- Parsing (what the server stores) ----

export type ValidRegistration = {
  givenName: string;
  familyName: string;
  /** E.164, e.g. +66812345678 */
  phone: string;
  email: string;
  role: AttendeeRole;
  roleOther: string | null;
  organisation: string | null;
  /** ISO dates, in Event order, no repeats. */
  eventDays: string[];
  /** In list order, no repeats. */
  referralSources: ReferralSource[];
  referralOther: string | null;
  competingTeamCheeredFor: string | null;
  accessibilityNeeds: string | null;
  comments: string | null;
};

export type ParseResult =
  | { ok: true; registration: ValidRegistration }
  | { ok: false; fieldErrors: FieldErrors };

const optionalText = (raw: string) => raw.trim() || null;
const nameText = cleanName;

/** Validates, then normalises: trimmed text, E.164 phone, empty optionals as null. */
export function parseRegistration(form: RegistrationForm): ParseResult {
  const fieldErrors = validateRegistration(form);
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  const role = form.role as AttendeeRole;
  const chosenSources = form.referralSources as ReferralSource[];

  return {
    ok: true,
    registration: {
      givenName: nameText(form.givenName),
      familyName: nameText(form.familyName),
      phone: phoneToE164(form.phone)!,
      email: form.email.trim(),
      role,
      roleOther: role === "other" ? optionalText(form.roleOther) : null,
      organisation: optionalText(form.organisation),
      eventDays: eventDayDates.filter((day) => form.eventDays.includes(day)),
      referralSources: referralSources.filter((source) => chosenSources.includes(source)),
      referralOther: chosenSources.includes("other") ? optionalText(form.referralOther) : null,
      competingTeamCheeredFor: optionalText(form.competingTeamCheeredFor),
      accessibilityNeeds: optionalText(form.accessibilityNeeds),
      comments: optionalText(form.comments),
    },
  };
}

/** Reads the form's fields from a submission; anything missing or unexpected is ignored. */
export function registrationFormFromFormData(formData: FormData): RegistrationForm {
  const form: RegistrationForm = { ...emptyRegistrationForm };
  for (const field of fieldOrder) {
    const values = formData.getAll(field).filter((value): value is string => typeof value === "string");
    if (isMultiValueField(field)) form[field] = values;
    else form[field] = values[0] ?? "";
  }
  return form;
}
