// The registration form's answers, kept across one switch of language. Following the TH | EN
// toggle saves them in this tab's sessionStorage; the form in the other language takes them once.
// Nothing else is stored, and storage that throws (private mode, blocked) just means no answers.

import { emptyRegistrationForm, type FieldName, fieldOrder, type RegistrationForm } from "@/lib/registrations/fields";

const STORAGE_KEY = "registration-form-answers";

export type KeptAnswers = {
  values: RegistrationForm;
  /** Fields that were showing an error; the other language works the messages out again. */
  errored: FieldName[];
};

export function keepAnswers(answers: KeptAnswers): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  } catch {
    // The switch still works; the other page starts empty.
  }
}

/** The kept answers, removed as they are read, or null when there are none (or they are unreadable). */
export function takeKeptAnswers(): KeptAnswers | null {
  let raw: string | null;
  try {
    raw = window.sessionStorage.getItem(STORAGE_KEY);
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    return readAnswers(JSON.parse(raw));
  } catch {
    return null;
  }
}

const isFieldName = (value: unknown): value is FieldName =>
  typeof value === "string" && (fieldOrder as readonly string[]).includes(value);

/** Only the form's own fields, each of the right shape; anything else is dropped. */
function readAnswers(stored: unknown): KeptAnswers | null {
  if (typeof stored !== "object" || stored === null) return null;
  const { values, errored } = stored as Record<string, unknown>;
  if (typeof values !== "object" || values === null) return null;

  const form: RegistrationForm = { ...emptyRegistrationForm };
  for (const field of fieldOrder) {
    const value = (values as Record<string, unknown>)[field];
    if (field === "eventDays" || field === "referralSources") {
      if (Array.isArray(value)) form[field] = value.filter((item): item is string => typeof item === "string");
    } else if (field === "pdpaAcknowledged") {
      form.pdpaAcknowledged = value === true;
    } else if (typeof value === "string") {
      form[field] = value;
    }
  }
  return { values: form, errored: Array.isArray(errored) ? errored.filter(isFieldName) : [] };
}
