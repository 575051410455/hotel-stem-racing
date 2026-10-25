# 02: Admin sees Registration acknowledgment evidence

**What to build:** An Admin Account holder can inspect the PDPA acknowledgment evidence for a Registration and can distinguish a Registration made before acknowledgment was introduced.

**Blocked by:** 01 — Attendee acknowledges the PDPA notice before Registration

**Status:** resolved

- [x] Registration detail shows the acknowledgment time in Bangkok time, the event notice version and the policy URL for a new Registration.
- [x] A Registration with no evidence reads “Not recorded”; no historical acknowledgment is inferred or backfilled.
- [x] The evidence remains visible only on Admin-only Registration detail, not on Event Passes, list rows or CSV export.
- [x] Registration module tests use a real database to cover a new and a legacy Registration.

## Answer

Implemented on Admin-only Registration detail. Integration tests verify evidence for a new Registration and null evidence for a legacy row.
