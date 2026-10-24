# 02: The registration form in English

**What to build:** On `/en` the whole registration form is English, and an English submission is answered in English.
- Form labels, hints, options, the submit button and the privacy lines come from the dictionary; the client form receives the strings it needs from its server parent.
- Field validation takes the language: every message, the organisation label, and the "this Event Day has passed" message. The Attendee Role and Referral Source labels (form and short forms) exist in both languages.
- The Server Action receives the form's language and validates with it. Duplicate Registration notices, the Turnstile problem and "too many submissions" messages come back in that language. A successful English registration lands on `/en/p/:token`; a Thai one on `/p/:token` as now.
- Turnstile is told the page's language.

See the spec ("Public wording", "Submitting") and `copy-public.md` ("Registration form", "Validation messages", "Security check", "Duplicate Registration notice").

**Blocked by:** 01

**Status:** resolved

- [x] Every string on the `/en` form matches `copy-public.md`; the Thai form is unchanged.
- [x] Validation messages for every field, in Thai and in English, while typing and after submitting, tested at the field-validation seam with literals from the copy deck.
- [x] The organisation label for each Attendee Role in both languages, tested.
- [x] Registration module test: an English submission's validation problems (including an ended Event Day) come back in English.
- [x] Duplicate Registration notice, Turnstile problems and the rate-limit message in English on `/en`.
- [x] An English registration redirects to `/en/p/:token`.
- [x] typecheck, lint, test and build pass. The hand-off records a check against `next start`: an English registration end to end, an English validation error, an English Duplicate Registration, and the Thai flow unchanged.

## Answer

Done on branch `thai-english-02-form`.

### What's where

| What | Where |
| --- | --- |
| Field validation takes the language: `validateField(field, form, language)`, `validateRegistration(form, language)`, `parseRegistration(form, language)`, `organisationLabel(role, language)`. Every message is in one `messages` table per language | `src/lib/registrations/fields.ts` |
| Attendee Role and Referral Source labels (form and short forms) keyed by language: `attendeeRoleLabels.en.parent` | `src/lib/registrations/fields.ts` |
| "{day} has already passed" per language | `endedEventDayErrors(chosen, now, language)` in `src/lib/registrations/event-day-availability.ts` |
| `submit(form, context, language)` (defaults to Thai) | `src/lib/registrations/registrations.ts` |
| The Server Action is bound to the page's language (`submitRegistration.bind(null, language)`), checks it, and redirects to `/en/p/:token` for English | `src/app/[lang]/actions.ts`, `src/app/[lang]/page.tsx` |
| Form, Turnstile and Duplicate wording | `registrationForm`, `botProtection`, `duplicateRegistration` in `src/app/[lang]/_dictionaries/` |
| The client form takes one `copy` prop (form, bot protection, duplicate, closed) and the `language` | `RegistrationForm.tsx`, `BotProtection.tsx`, `DuplicateRegistrationNotice.tsx`, `controls.tsx` (`requiredLabel`) |

### Decisions

- **The language travels as a bound argument**, not a form field: the page binds it, Next encrypts bound arguments, and the action still falls back to Thai for anything that isn't a language.
- **`submit`'s language defaults to Thai**, the app's default, so the many existing callers and tests stay as they were.
- **Back Office callers read `.th` labels** for now (`attendeeRoleShortLabels.th[role]`, `organisationLabel(role, "th")`); tickets 07–09 switch them.
- **`{email}` placeholders** in the Duplicate wording: client components can't take functions from the dictionary, so the notice splits the string around the masked email.
- **The phone message in English** mirrors today's Thai one ("Enter a 10-digit Thai mobile or 9-digit landline number, such as 081-234-5678"); ticket 05 replaces both with the deck's international wording.
- **The rate-limit message** is built in the dictionary from `SUBMISSION_WINDOW_MINUTES`, so both languages name the same wait.

### Verified

- typecheck, lint, 231 tests and build pass. New tests: every validation message in English (empty form, name problems, phone, email, free text, Attendee Role, organisation, Event Day, Referral Source), the organisation label in both languages, parsing an invalid English form, and the Registration module answering an English submission (with an ended Event Day) in English.
- **Headless Chrome against `next start`** (scratch copy of the demo database, built with Cloudflare's always-pass Turnstile test site key; 11 checks, all pass):
  - the `/en` form has no Thai: labels, options, hints, "(required)", button and privacy lines match the copy deck; the organisation label changes for a Sponsor
  - English errors after an empty submit and while typing
  - an English registration lands on `/en/p/:token`
  - the same name and phone again: the English Duplicate Registration notice ("You registered with j***@example.com.", "Call 02-123-4567", "Register someone else" → `/en`)
  - the Thai form's errors and registration are unchanged
  - against a second server with Cloudflare's always-fail test secret: "The security check didn't pass…" in English
  - Turnstile's frame loads with `?lang=en` on `/en` and `?lang=th` on `/`
- **Not checked live:** the "too many submissions" message (60 accepted submissions per IP in 10 minutes); its English text is in the dictionary next to the bot-check one that was seen.
