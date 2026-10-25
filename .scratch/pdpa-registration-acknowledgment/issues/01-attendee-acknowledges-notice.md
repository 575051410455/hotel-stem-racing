# 01: Attendee acknowledges the PDPA notice before Registration

**What to build:** An Attendee can read the event's PDPA notice in Thai or English, open the organiser's full policy, and acknowledge it before submitting a Registration. A successful Registration carries evidence of that acknowledgment.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] The notice appears immediately after questions or suggestions in both languages, with the official policy link and an initially unchecked, accessible required checkbox.
- [x] A missing or altered acknowledgment shows a localized error and cannot create a Registration, including through a direct form submission.
- [x] An accepted Registration atomically records the server time, the policy URL and the version of the event notice shown; a Duplicate Registration leaves the original record unchanged.
- [x] Switching public languages keeps the checkbox state with the Attendee's other answers; the old short privacy sentence is removed.
- [x] The pure field-validation and Registration module tests cover these behaviors at the agreed seams, and the schema migration allows existing Registrations to have no evidence.

## Answer

Implemented with bilingual notice copy, shared field validation, server-side submission checks and nullable Registration evidence. A generated migration adds the evidence columns. Focused Registration module and pure field tests pass.
