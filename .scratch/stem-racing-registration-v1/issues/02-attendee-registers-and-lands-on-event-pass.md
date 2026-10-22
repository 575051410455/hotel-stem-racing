# 02: Attendee registers and lands on their Event Pass

**What to build:** An Attendee fills in the full registration form at `/` (all fields and rules from the spec, in Thai) and submits it. The Registration is saved with a token and a Pass Code, and the Attendee is taken to their Event Pass at `/p/{token}`. The page shows the QR, the Pass Code, their name and their Event Days. This is the core tracer bullet.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] The form has every field in the spec's order, with the spec's rules:
  - given name / family name: Thai vowels and tone marks accepted
  - phone: Thai mobile or landline, formatted as you type
  - email
  - Attendee Role, with "Other" requiring text
  - organisation: required and relabelled for Sponsors
  - Event Days: at least one
  - Referral Sources: at least one, with "Other" requiring text
  - Competing Team cheered for, accessibility needs, comments: optional
- [ ] Errors appear in Thai when the Attendee leaves a field and are re-checked as they type after an error. Required fields are marked. `aria-invalid` and `aria-describedby` are wired.
- [ ] Submit is `aria-disabled` until the form is valid. A blocked submit focuses the first invalid field.
- [ ] The organisers' privacy notice sits under the submit button
- [ ] The server re-validates with the same pure validators, then saves the Registration with a random UUID v4 token and an `EP-` Pass Code drawn from the alphabet without O/0/I/1
- [ ] After saving, the browser lands on `/p/{token}`:
  - shows the QR as SVG with error correction M, encoding the Event Pass link built from `APP_URL` at render time, plus the Pass Code, name and Event Days
  - never shows email or phone
  - an unknown token shows a not-found page
- [ ] Unit tests cover field validation (e.g. "วิชัย", every phone format) and the Event Pass codec (alphabet, normalisation, link building)
- [ ] Registration-module integration tests cover a valid submission retrievable by token, invalid fields returning their messages, and the Sponsor and "Other" rules
