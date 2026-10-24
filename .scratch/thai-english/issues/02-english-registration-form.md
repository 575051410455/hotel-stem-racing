# 02: The registration form in English

**What to build:** On `/en` the whole registration form is English, and an English submission is answered in English.
- Form labels, hints, options, the submit button and the privacy lines come from the dictionary; the client form receives the strings it needs from its server parent.
- Field validation takes the language: every message, the organisation label, and the "this Event Day has passed" message. The Attendee Role and Referral Source labels (form and short forms) exist in both languages.
- The Server Action receives the form's language and validates with it. Duplicate Registration notices, the Turnstile problem and "too many submissions" messages come back in that language. A successful English registration lands on `/en/p/:token`; a Thai one on `/p/:token` as now.
- Turnstile is told the page's language.

See the spec ("Public wording", "Submitting") and `copy-public.md` ("Registration form", "Validation messages", "Security check", "Duplicate Registration notice").

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Every string on the `/en` form matches `copy-public.md`; the Thai form is unchanged.
- [ ] Validation messages for every field, in Thai and in English, while typing and after submitting, tested at the field-validation seam with literals from the copy deck.
- [ ] The organisation label for each Attendee Role in both languages, tested.
- [ ] Registration module test: an English submission's validation problems (including an ended Event Day) come back in English.
- [ ] Duplicate Registration notice, Turnstile problems and the rate-limit message in English on `/en`.
- [ ] An English registration redirects to `/en/p/:token`.
- [ ] typecheck, lint, test and build pass. The hand-off records a check against `next start`: an English registration end to end, an English validation error, an English Duplicate Registration, and the Thai flow unchanged.
