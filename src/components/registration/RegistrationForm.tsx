"use client";

import {
  type ChangeEvent,
  type FormEvent,
  startTransition,
  useActionState,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import type { EventDay } from "@/lib/event";
import type { Language } from "@/lib/language";
import {
  attendeeRoleLabels,
  attendeeRoles,
  emptyRegistrationForm,
  type FieldErrors,
  type FieldName,
  fieldOrder,
  formatPhoneAsYouType,
  maxLengths,
  organisationLabel,
  type RegistrationForm as FormValues,
  referralSourceLabels,
  referralSources,
  validateRegistration,
} from "@/lib/registrations/fields";
import { BotProtection, type BotProtectionCopy } from "./BotProtection";
import { ChoiceGroup, TextAreaField, TextField } from "./controls";
import { type DuplicateRegistrationCopy, DuplicateRegistrationNotice } from "./DuplicateRegistrationNotice";
import { keepAnswers, takeKeptAnswers } from "./kept-answers";
import { RegistrationClosed, type RegistrationClosedCopy } from "./RegistrationClosed";
import type { RegistrationFormState, SubmitRegistrationAction } from "./form-state";

/** Every string the form shows, from the page's dictionary (a client component can't read it). */
export type RegistrationFormCopy = {
  form: {
    formName: string;
    intro: string;
    requiredKey: string;
    requiredForScreenReaders: string;
    givenName: string;
    familyName: string;
    phone: string;
    phoneHint: string;
    phonePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    roleQuestion: string;
    chooseOne: string;
    chooseOneOrMore: string;
    roleOther: string;
    organisationHintSponsor: string;
    organisationHintOthers: string;
    eventDaysQuestion: string;
    referralQuestion: string;
    referralOther: string;
    teamCheeredFor: string;
    accessibilityNeeds: string;
    accessibilityHints: string[];
    comments: string;
    submit: string;
    submitting: string;
    privacyNote: string;
    onePerForm: string;
  };
  botProtection: BotProtectionCopy;
  duplicate: DuplicateRegistrationCopy;
  closed: RegistrationClosedCopy;
};

const initialState: RegistrationFormState = { status: "idle" };

type ListField = "eventDays" | "referralSources";
type TextFieldName = Exclude<FieldName, ListField | "role">;

const inputId = (field: FieldName) => `registration-${field}`;

function withFields(set: ReadonlySet<FieldName>, fields: readonly FieldName[]): ReadonlySet<FieldName> {
  return fields.every((field) => set.has(field)) ? set : new Set([...set, ...fields]);
}

/** Focuses a field's control; for a radio or checkbox group, its first option. */
function focusField(form: HTMLFormElement, field: FieldName) {
  const control = form.elements.namedItem(field);
  const target = control instanceof RadioNodeList ? control[0] : control;
  if (target instanceof HTMLElement) target.focus();
}

// Phone formatting moves characters around; keep the caret after the same digit.
const PHONE_SIGNIFICANT = /[\d+]/;
const countSignificant = (text: string) => [...text].filter((char) => PHONE_SIGNIFICANT.test(char)).length;
function caretAfterSignificant(formatted: string, count: number) {
  if (count === 0) return 0;
  let seen = 0;
  for (let index = 0; index < formatted.length; index++) {
    if (PHONE_SIGNIFICANT.test(formatted[index]) && ++seen === count) return index + 1;
  }
  return formatted.length;
}

type RegistrationFormProps = {
  action: SubmitRegistrationAction;
  /** The Event Days that have not ended; the page works these out at request time. */
  eventDays: readonly EventDay[];
  /** The page's language: labels, validation messages and the server's answers follow it. */
  language: Language;
  copy: RegistrationFormCopy;
};

export function RegistrationForm({ action, eventDays, language, copy }: RegistrationFormProps) {
  const text = copy.form;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [values, setValues] = useState<FormValues>(emptyRegistrationForm);
  // Fields that have shown an error; from then on they are re-validated as the Attendee types.
  const [errored, setErrored] = useState<ReadonlySet<FieldName>>(() => new Set());
  // Errors only the server found; each one clears when its field changes.
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [handledState, setHandledState] = useState(state);
  const formRef = useRef<HTMLFormElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const phoneCaret = useRef<number | null>(null);
  const closedRef = useRef<HTMLElement>(null);
  const duplicateRef = useRef<HTMLElement>(null);

  if (state !== handledState) {
    setHandledState(state);
    if (state.status === "invalid") {
      setServerErrors(state.fieldErrors);
      setErrored((current) => withFields(current, Object.keys(state.fieldErrors) as FieldName[]));
    }
  }

  useEffect(() => {
    if (state.status !== "invalid" || !formRef.current) return;
    const first = fieldOrder.find((field) => state.fieldErrors[field]);
    if (first) focusField(formRef.current, first);
  }, [state]);

  useEffect(() => {
    if (state.status === "closed") closedRef.current?.focus();
    if (state.status === "duplicate") duplicateRef.current?.focus();
  }, [state]);

  // Answers given in the other language, kept when the Attendee followed the TH | EN toggle. Read
  // after hydration (the server can't see this tab's storage) but before paint, so the form never
  // flashes empty. A day that has ended since is dropped: it has no box to show it ticked.
  useLayoutEffect(() => {
    const kept = takeKeptAnswers();
    if (!kept) return;
    const openDays = eventDays.map((day) => day.date);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a one-off read of browser storage
    setValues({ ...kept.values, eventDays: kept.values.eventDays.filter((day) => openDays.includes(day)) });
    setErrored(new Set(kept.errored));
  }, [eventDays]);

  // Following the toggle is a full page load, so the answers go to this tab's sessionStorage first.
  const keepAnswersForSwitch = useEffectEvent(() => {
    if (state.status === "closed" || state.status === "duplicate") return;
    keepAnswers({ values, errored: [...errored] });
  });
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-language-switch]")) keepAnswersForSwitch();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useLayoutEffect(() => {
    const input = phoneRef.current;
    if (phoneCaret.current === null || !input || document.activeElement !== input) return;
    input.setSelectionRange(phoneCaret.current, phoneCaret.current);
    phoneCaret.current = null;
  });

  const liveErrors = validateRegistration(values, language);
  const isValid = Object.keys(liveErrors).length === 0;
  const errorFor = (field: FieldName) =>
    errored.has(field) ? (liveErrors[field] ?? serverErrors[field]) : undefined;

  function change<F extends FieldName>(field: F, value: FormValues[F]) {
    setValues((current) => ({ ...current, [field]: value }));
    setServerErrors((current) => {
      if (!(field in current)) return current;
      const rest = { ...current };
      delete rest[field];
      return rest;
    });
  }

  /** Leaving a field shows its error, if it has one. */
  function leave(field: FieldName) {
    if (liveErrors[field]) setErrored((current) => withFields(current, [field]));
  }

  function toggle(field: ListField, value: string, checked: boolean) {
    const current = values[field];
    change(field, checked ? [...current, value] : current.filter((item) => item !== value));
  }

  function changePhone(event: ChangeEvent<HTMLInputElement>) {
    const { value, selectionStart } = event.target;
    const formatted = formatPhoneAsYouType(value);
    phoneCaret.current = caretAfterSignificant(
      formatted,
      countSignificant(value.slice(0, selectionStart ?? value.length)),
    );
    change("phone", formatted);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Submission always goes through here so the browser checks every field first; the
    // form's `action` only serves browsers that haven't loaded JavaScript yet.
    event.preventDefault();
    if (pending) return;

    const form = event.currentTarget;
    const invalid = fieldOrder.filter((field) => liveErrors[field]);
    if (invalid.length > 0) {
      flushSync(() => setErrored((current) => withFields(current, invalid)));
      focusField(form, invalid[0]);
      return;
    }

    const formData = new FormData(form);
    startTransition(() => formAction(formData));
  }

  const textProps = (field: TextFieldName) => ({
    id: inputId(field),
    name: field,
    value: values[field],
    maxLength: maxLengths[field],
    error: errorFor(field),
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      change(field, event.target.value),
    onBlur: () => leave(field),
  });

  const isSponsor = values.role === "sponsor";
  const roleOptions = attendeeRoles.map((value) => ({ value, label: attendeeRoleLabels[language][value] }));
  const referralOptions = referralSources.map((value) => ({ value, label: referralSourceLabels[language][value] }));
  const eventDayOptions = eventDays.map((day) => ({ value: day.date, label: day.label[language] }));

  // The last Event Day ended while the form was open.
  if (state.status === "closed") return <RegistrationClosed ref={closedRef} copy={copy.closed} language={language} />;
  // Already registered: the Event Pass only goes to the registered email, never to this screen.
  if (state.status === "duplicate") {
    return <DuplicateRegistrationNotice ref={duplicateRef} result={state} copy={copy.duplicate} language={language} />;
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleSubmit}
      noValidate
      aria-label={text.formName}
      className="mx-auto flex w-[min(100%,528px)] flex-col gap-6 rounded-input border border-line bg-surface p-5 tab:gap-7 tab:p-8"
    >
      <div className="flex flex-col gap-1">
        <p>{text.intro}</p>
        <p className="text-[0.875rem] text-muted">
          <span className="text-accent">*</span> {text.requiredKey}
        </p>
      </div>

      <div className="grid gap-6 tab:grid-cols-2 tab:gap-4">
        <TextField {...textProps("givenName")} label={text.givenName} required autoComplete="given-name" />
        <TextField {...textProps("familyName")} label={text.familyName} required autoComplete="family-name" />
      </div>

      <TextField
        {...textProps("phone")}
        ref={phoneRef}
        onChange={changePhone}
        label={text.phone}
        help={text.phoneHint}
        required
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder={text.phonePlaceholder}
      />

      <TextField
        {...textProps("email")}
        label={text.email}
        required
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        placeholder={text.emailPlaceholder}
      />

      <div className="flex flex-col gap-4">
        <ChoiceGroup
          id={inputId("role")}
          name="role"
          type="radio"
          legend={text.roleQuestion}
          hint={text.chooseOne}
          options={roleOptions}
          selected={[values.role]}
          required
          requiredLabel={text.requiredForScreenReaders}
          error={errorFor("role")}
          onToggle={(value) => change("role", value)}
          onLeave={() => leave("role")}
        />
        {values.role === "other" && (
          <TextField {...textProps("roleOther")} label={text.roleOther} required />
        )}
      </div>

      <TextField
        {...textProps("organisation")}
        label={organisationLabel(values.role, language)}
        required={isSponsor}
        help={isSponsor ? text.organisationHintSponsor : text.organisationHintOthers}
        autoComplete="organization"
      />

      <ChoiceGroup
        id={inputId("eventDays")}
        name="eventDays"
        type="checkbox"
        legend={text.eventDaysQuestion}
        hint={eventDayOptions.length > 1 ? text.chooseOneOrMore : text.chooseOne}
        options={eventDayOptions}
        selected={values.eventDays}
        required
        requiredLabel={text.requiredForScreenReaders}
        error={errorFor("eventDays")}
        onToggle={(value, checked) => toggle("eventDays", value, checked)}
        onLeave={() => leave("eventDays")}
      />

      <div className="flex flex-col gap-4">
        <ChoiceGroup
          id={inputId("referralSources")}
          name="referralSources"
          type="checkbox"
          legend={text.referralQuestion}
          hint={text.chooseOneOrMore}
          options={referralOptions}
          selected={values.referralSources}
          required
          requiredLabel={text.requiredForScreenReaders}
          error={errorFor("referralSources")}
          onToggle={(value, checked) => toggle("referralSources", value, checked)}
          onLeave={() => leave("referralSources")}
          columns={2}
        />
        {values.referralSources.includes("other") && (
          <TextField {...textProps("referralOther")} label={text.referralOther} required />
        )}
      </div>

      <TextField {...textProps("competingTeamCheeredFor")} label={text.teamCheeredFor} />

      <TextAreaField
        {...textProps("accessibilityNeeds")}
        label={text.accessibilityNeeds}
        help={text.accessibilityHints.map((hint) => (
          <p key={hint}>{hint}</p>
        ))}
      />

      <TextAreaField {...textProps("comments")} label={text.comments} />

      <div className="flex flex-col gap-4">
        <BotProtection state={state} pending={pending} copy={copy.botProtection} language={language} />
        <button
          type="submit"
          aria-disabled={!isValid || pending}
          className="flex h-12 w-full items-center justify-center rounded-pill bg-accent px-6 text-base font-bold text-white transition-colors hover:bg-accent-dark active:shadow-[#000_3px_2px_6px_inset] aria-disabled:opacity-60 aria-disabled:hover:bg-accent aria-disabled:active:shadow-none tab:h-14"
        >
          {pending ? text.submitting : text.submit}
        </button>
        <div className="flex flex-col gap-2 text-[0.875rem] text-muted">
          <p>{text.privacyNote}</p>
          <p>{text.onePerForm}</p>
        </div>
      </div>
    </form>
  );
}
