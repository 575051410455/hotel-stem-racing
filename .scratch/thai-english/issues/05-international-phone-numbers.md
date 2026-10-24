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

**Status:** resolved

- [x] Field validation tests: a Thai mobile, a Thai landline, `+66`, a valid international number, too short, too long, a foreign number without `+`; formatting as-you-type for an international number.
- [x] Registration module tests: an international number registers and is stored as E.164; the same names with the same international number is a Duplicate Registration.
- [x] Search test: an international number found as typed with or without `+`, spaces or hyphens.
- [x] CSV test: an international number in both phone columns.
- [x] The hint and the new error message in both languages match `copy-public.md`.
- [x] typecheck, lint, test and build pass. The hand-off records a check against `next start`: an international number registers in both languages, shows in the list and detail, and is found by search.

## Answer

Done on branch `thai-english-05-international-phones`.

### What's where

| What | Where |
| --- | --- |
| `INTERNATIONAL = /^\+[1-9]\d{7,14}$/` after removing spaces and hyphens; anything starting `+66` still follows the Thai rules | `phoneToE164` in `src/lib/registrations/fields.ts` |
| As-you-type: Thai grouping as before; other `+` numbers keep only digits, spaces and hyphens | `formatPhoneAsYouType` in the same file |
| The new error message in both languages | `messages.th.phoneInvalid`, `messages.en.phoneInvalid` |
| The phone hint in both languages | `registrationForm.phoneHint` in the dictionaries; `help` on the phone field |

Back Office display (`formatPhone`), the CSV (`localPhone`) and search (`phonePatterns`, any run of digits) already treated a non-`+66` number as its E.164 string, so they needed only tests.

### Decisions

- **A country code never starts with 0** (`+0…` is refused), as in E.164.
- **The input's 20-character limit stays**: the longest number E.164 allows, written with the usual groups, fits.
- **Brackets and dots are dropped as typed** ("+1 (415) 555.0100" shows "+1 415 5550100"), per "removing characters other than digits, spaces and hyphens".
- The test that listed "+1 415 555 0100" as not Thai now lists "447700900123" (a foreign number without +); the old Thai message in the Registration module test is the deck's new one.

### Verified

- typecheck, lint, 237 tests and build pass. New tests:
  - **Field validation:** international numbers accepted and stored as E.164 (8 and 15 digits at the edges); too short, too long, no country code (`+0`) and stray characters refused with the new English message; foreign numbers without + refused with the new Thai message; formatting as-you-type for international numbers; formatted input stays valid.
  - **Registration module:** an international number registers and is stored as `+447700900123`; the same names with the same international number (typed differently) is a Duplicate Registration.
  - **Search:** found as `+447700900123`, `+44 7700 900123`, `447700900123`, `44-7700-900123` and `7700 900123`.
  - **CSV:** E.164 in both phone columns.
- **Headless Chrome against `next start`** (13 checks, all pass): hints and errors in both languages; "+44 7700 900123" stays as typed and registers on `/en`, "+1 (415) 555-0100" shows "+1 415 555-0100" and registers on `/`; signed in as Staff, list search by three spellings finds it with the phone cell "+447700900123"; the detail page shows "+447700900123" linked to `tel:+447700900123`; the CSV export has `'+447700900123` in both phone columns (and `'+14155550100` for the other).
