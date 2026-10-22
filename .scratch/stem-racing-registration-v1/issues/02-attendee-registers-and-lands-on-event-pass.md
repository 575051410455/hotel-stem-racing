# 02: Attendee registers and lands on their Event Pass

**What to build:** An Attendee fills in the full registration form at `/` (all fields and rules from the spec, in Thai) and submits it. The Registration is saved with a token and a Pass Code, and the Attendee is taken to their Event Pass at `/p/{token}`. The page shows the QR, the Pass Code, their name and their Event Days. This is the core tracer bullet.

**Blocked by:** 01

**Status:** resolved

- [x] The form has every field in the spec's order, with the spec's rules:
  - given name / family name: Thai vowels and tone marks accepted
  - phone: Thai mobile or landline, formatted as you type
  - email
  - Attendee Role, with "Other" requiring text
  - organisation: required and relabelled for Sponsors
  - Event Days: at least one
  - Referral Sources: at least one, with "Other" requiring text
  - Competing Team cheered for, accessibility needs, comments: optional
- [x] Errors appear in Thai when the Attendee leaves a field and are re-checked as they type after an error. Required fields are marked. `aria-invalid` and `aria-describedby` are wired.
- [x] Submit is `aria-disabled` until the form is valid. A blocked submit focuses the first invalid field.
- [x] The organisers' privacy notice sits under the submit button
- [x] The server re-validates with the same pure validators, then saves the Registration with a random UUID v4 token and an `EP-` Pass Code drawn from the alphabet without O/0/I/1
- [x] After saving, the browser lands on `/p/{token}`:
  - shows the QR as SVG with error correction M, encoding the Event Pass link built from `APP_URL` at render time, plus the Pass Code, name and Event Days
  - never shows email or phone
  - an unknown token shows a not-found page
- [x] Unit tests cover field validation (e.g. "วิชัย", every phone format) and the Event Pass codec (alphabet, normalisation, link building)
- [x] Registration-module integration tests cover a valid submission retrievable by token, invalid fields returning their messages, and the Sponsor and "Other" rules

## Answer

Done in commit "feat(registration): …". Notes for downstream tickets.

### Modules and names
- **Field validation** (pure, browser and server): `src/lib/registrations/fields.ts`.
  - Types: `RegistrationForm` (raw strings and string arrays, as typed), `FieldName`, `FieldErrors`, `ValidRegistration`.
  - Constants: `fieldOrder` (form order, also used for focusing), `maxLengths`, `attendeeRoles` with `attendeeRoleLabels`, `referralSources` with `referralSourceLabels`, `emptyRegistrationForm`.
  - Functions:
    - `validateField(field, form)` → Thai message or `undefined`
    - `validateRegistration(form)` → `{}` when valid
    - `parseRegistration(form)` → `{ ok: true, registration } | { ok: false, fieldErrors }`
    - `registrationFormFromFormData(formData)`
    - `phoneToE164(raw)`, `formatPhoneAsYouType(raw)`, `organisationLabel(role)`
- **Event Pass codec** (pure): `src/lib/registrations/event-pass-codec.ts`.
  - `PASS_CODE_ALPHABET` (32 characters, so picks are unbiased) and `generatePassCode()`.
  - `normalisePassCode(input)` returns the stored form `EP-XXXXXXXX`, or `null`. It accepts any case, spaces and hyphens, but requires the `EP` prefix.
  - `passLink(token, appUrl = process.env.APP_URL)` trims trailing slashes and throws when APP_URL is unset.
  - Ticket 13 adds `resolveScan` here.
- **Registration module:** `createRegistrations(deps)` now has `submit` next to `getEventPass`. There is a new optional dependency, `generatePassCode?: () => string`, which tests use to force a Pass Code collision.
- **UI:**
  - Server Action: `submitRegistration` in `src/app/(public)/actions.ts`.
  - Form: `src/components/registration/RegistrationForm.tsx`, built from controls in `controls.tsx`.
  - Pass page: `src/app/(public)/p/[token]/page.tsx`, rendering `EventPassCard.tsx`, with `not-found.tsx` beside it.

### Submit interface
```ts
registrations.submit(form: RegistrationForm): Promise<SubmitResult>

type SubmitResult =
  | { status: "accepted"; pass: EventPass } // EventPass = { token, passCode, givenName, familyName, eventDays }
  | { status: "invalid"; fieldErrors: FieldErrors }; // Thai message per field
```
- Add new variants as new union members: `duplicate` (06), `closed` (07), `bot-check-failed` (08).
- The Server Action redirects on `accepted` and returns every other result unchanged as `RegistrationFormState` (`src/components/registration/form-state.ts`, which is `{ status: "idle" } | Exclude<SubmitResult, accepted>`).
- New variants therefore reach the form without code changes. However, the form only renders `invalid`, and TypeScript won't force you to handle a new status, so add its UI in `RegistrationForm.tsx`.

### Per ticket
- **06:**
  - `duplicateKey` (internal to `registrations.ts`) is the folded given name, U+001F, the folded family name, U+001F, then the E.164 phone. Folding means trim, collapse whitespace, NFC, then lower-case.
  - A duplicate currently throws a raw `DrizzleQueryError` from the Server Action, and the user sees Next's error page.
  - `isUniqueViolation(error, constraint)` in `registrations.ts` already walks `.cause` (Postgres `code 23505`, `constraint_name`).
  - `save()` retries only on `registrations_passCode_unique` (up to 5 draws, same token). Catch `registrations_duplicateKey_unique` there.
- **07:**
  - `validateField("eventDays")` accepts any day in `event.eventDays`.
  - The form lists every day from the constant `eventDayOptions` in `RegistrationForm.tsx`, which carries a comment for this ticket.
  - The server-side clock check could be a parameter on `parseRegistration` or a check in `submit` before parsing. `deps.clock` is already there.
- **08:**
  - `submit` takes only the form today. Add a second parameter, e.g. `context?: { botCheckToken?: string; remoteIp?: string }`, rather than putting request data into `RegistrationForm`.
  - `registrationFormFromFormData` ignores unknown keys, so the Turnstile field can travel in the same FormData.
- **10:**
  - Send from the `accepted` branch of `submit`, after `save()`.
  - `passLink` reads APP_URL by default. Consider injecting `appUrl` through `RegistrationDependencies` so tests don't depend on the environment.
- **13:**
  - Compare `normalisePassCode(typed)` directly with `registrations.pass_code`.
  - `getEventPass` returns `not-found` for anything that isn't UUID-shaped, without querying.

### Gotchas and conservative choices
- **Email pattern.** The template's regex isn't in the repo. I used:
  - a dot-atom local part
  - hostname labels
  - a letters-only TLD of at least 2 characters
  - ASCII only

  Thai/IDN addresses are rejected. There are no "did you mean gmail.com" suggestions.
- **"At least 2 letters"** counts letters and combining marks together, so short Thai names such as "ปู" (one consonant plus a vowel mark) pass.
  - Doubled spaces are rejected, because the spec says groups are joined by a single separator.
  - The smart apostrophe ’ is accepted.
- **Phone.**
  - `+66 081-…` (the trunk 0 kept after +66) is accepted.
  - On the server, only spaces and dashes count as separators. In the browser, the formatter drops any other character as you type and keeps the caret in place.
  - 9-digit numbers starting 06 pass as landlines, exactly as the rule is written.
- **Stored values.**
  - Names are trimmed and NFC-normalised. Email is trimmed, with case kept.
  - Empty optional fields are stored as NULL. The "Other" texts are stored only when Other is chosen.
  - Event Days and Referral Sources are de-duplicated, in list order.
- **Unknown token.** It renders the not-found UI with `noindex`, but the HTTP status is **200**: `notFound()` runs inside `<Suspense>` after the shell has streamed. A real 404 would need a Proxy check; `src/proxy.ts` wasn't mine to add.
- **Pass page.**
  - Metadata sets `robots: noindex` and `referrer: no-referrer`, so the token doesn't leak through the footer's LINE link.
  - The QR (react-qr-code, level M, SVG) renders on the server, so it ships no client JS.
- **Submitting.**
  - `onSubmit` always calls `preventDefault`, validates, then dispatches the `useActionState` action in `startTransition`. This avoids React's automatic form reset.
  - `action={formAction}` stays on the form, so it also works before hydration (no-JS progressive enhancement). Server errors then render in the returned page.
- **Copy beyond the organisers' form:**
  - Thai validation messages
  - the "Other" text labels (โปรดระบุฐานะการเข้าร่วมงาน / โปรดระบุช่องทางที่ทราบข่าว)
  - the submit label ลงทะเบียน
  - a screenshot hint on the pass page
  - Event Pass labels
  - the not-found text

  "ถ้าสแกนไม่ได้ แจ้งรหัสนี้" comes from the spec's email section.

### Verification
- `npm run typecheck`, `npm run lint`, `npm test` (49 tests) and `npm run build` all pass.
- Smoke test against `next build` + `next start -p 3102` and a dev database (`stem_racing_t02`):
  - **No-JS action POST:**
    - An invalid POST returns the Thai errors.
    - A valid POST gets a 303 to `/p/{token}`. The row is stored normalised (E.164 phone, NULL optionals).
    - The pass page shows the Pass Code, name, both days and the thank-you message, with no email or phone.
    - The QR SVG matches `APP_URL/p/{token}` at level M.
    - Unknown and malformed tokens show the not-found UI.
  - **Chrome with JS:**
    - A blocked submit focused ชื่อ.
    - Typing re-validated errored fields.
    - The phone formatted as 089-876-5432 and kept the caret through a mid-number edit.
    - Choosing Sponsor relabelled the organisation field and made it required.
    - The submit landed on the pass page.
    - There was no horizontal scroll at 320px on `/`, the pass page or the not-found page, and no console errors.
