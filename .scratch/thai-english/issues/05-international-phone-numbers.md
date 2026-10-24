# 05: International phone numbers

**What to build:** The form accepts a phone number starting with `+` and a country code, in both languages, and the Back Office can show and find it.
- **Accepted:** Thai numbers as now (10-digit mobile or 9-digit landline starting with 0, or the same written `+66 …`); international numbers as `+`, a country code other than 66, and 8–15 digits in all. Spaces and hyphens are allowed. A number without `+` that isn't a valid Thai number is refused.
- **Stored** as E.164, as now; no schema change. Duplicate Registration is unchanged (same normalised names and E.164 phone).
- **Typing:** Thai grouping as now; an international number is left as typed apart from removing characters other than digits, spaces and hyphens.
- **Copy:** the phone field gains a hint, and its error names both formats, in both languages.
- **Back Office and CSV:** a Thai number in local form as now, an international one as its E.164 string. The CSV's E.164 column is unchanged.
- **Search** by phone finds an international number typed with or without `+`, spaces or hyphens.

See the spec ("International phone numbers") and `copy-public.md` ("Phone hint", "Phone invalid").

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Field validation tests: a Thai mobile, a Thai landline, `+66`, a valid international number, too short, too long, a foreign number without `+`; formatting as-you-type for an international number.
- [ ] Registration module tests: an international number registers and is stored as E.164; the same names with the same international number is a Duplicate Registration.
- [ ] Search test: an international number found as typed with or without `+`, spaces or hyphens.
- [ ] CSV test: an international number in both phone columns.
- [ ] The hint and the new error message in both languages match `copy-public.md`.
- [ ] typecheck, lint, test and build pass. The hand-off records a check against `next start`: an international number registers in both languages, shows in the list and detail, and is found by search.
