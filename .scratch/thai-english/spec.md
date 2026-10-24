# Spec: Thai and English public pages, an English Back Office, and international phone numbers

Status: ready-for-agent

Vocabulary follows `GLOSSARY.md`. "หลังบ้าน admin" in the request means the **Back Office** used by **Staff** (every Staff Account). It is not a new Admin role. Respects ADR 0002 (Attendees register without Accounts) and ADR 0003 (Kiosk Accounts are check-in only).

**The wording is in two companion files.** Review them before implementation:
- [`copy-public.md`](copy-public.md): every public string, Thai and English side by side.
- [`copy-back-office.md`](copy-back-office.md): every Back Office string in English, plus the Staff-only parts of the Kiosk.

**Deadline:** merged to `main` by **28 October 2026**, public pages first.
- The Back Office is frozen from 29 October to 1 November (the Event).
- If the English Back Office can't be finished by then, all of it moves to after the Event. It is not shipped half-translated.

## Problem Statement

Today every public page is Thai only. That covers the registration form, the Event Pass page and the Event Pass card. People who don't read Thai, such as international guests and sponsors' staff, can't register on their own. Even with an English page they would still be stuck: the form accepts only Thai phone numbers.

The organisers also want the Back Office in English.

## Solution

1. **A `TH | EN` toggle on every public page.**
   - Thai stays the default at the current addresses. English lives at the same paths under `/en` (for example `/en` and `/en/p/…`), so the organisers can share an English link directly.
   - Switching language mid-form keeps every answer already given.
   - Event Pass links in QR codes and emails don't change. The Event Pass email and the Kiosk are already in Thai and English, and stay as they are.
2. **International phone numbers.** The form accepts a phone number starting with `+` and a country code, in both languages. Thai numbers work as before.
3. **An English Back Office** with no language toggle.
   - It covers sign-in, every page, toasts, the CSV export, and the Staff-only parts of the Kiosk.
   - Screens Attendees see (the Kiosk and Kiosk mode at the check-in desk) stay in Thai with English.

## User Stories

### Attendee: choosing a language

1. As an Attendee, I want a `TH | EN` toggle at the top right of every public page, so that I can read the page in my language.
2. As an Attendee, I want the toggle to show which language is on, so that I know where I am.
3. As an Attendee who doesn't read Thai, I want an English address (`/en`) the organisers can send me, so that I land on English straight away.
4. As an Attendee, I want the Thai page at the address I already know (`/`), so that existing links and posters keep working.
5. As an Attendee, I want the page to stay in the language I opened, not guess from my browser, so that a shared link always looks the same.
6. As an Attendee halfway through the form, I want my typed answers and ticked choices kept when I switch language, so that I don't start again.
7. As an Attendee who sees an error and then switches language, I want the error shown in the new language, so that I understand it.
8. As an Attendee using a screen reader, I want the toggle announced as a language choice, with the current language marked, so that I can switch without guessing.
9. As an Attendee, I want the toggle to work before the page's scripts finish loading, so that a slow connection doesn't trap me in one language.
10. As an Attendee on a phone, I want the toggle easy to tap at 375 px, so that I can switch at the entrance.

### Attendee: registering in English

11. As an Attendee, I want the page title, introduction, date and venue in English, with the year as 2026, so that the details make sense to me.
12. As an Attendee, I want every form label, hint and option in English, so that I can answer every question.
13. As an Attendee, I want the Event Days shown as "Saturday 31 October 2026" and "Sunday 1 November 2026", so that I pick the right day.
14. As an Attendee, I want every validation message in English, both while typing and after I submit, so that I can fix mistakes.
15. As an Attendee, I want the security check (Turnstile) in English, so that I understand what it asks.
16. As an Attendee, I want the security check's problem messages and the "too many submissions" message in English, so that I know what to do.
17. As an Attendee who is already registered, I want the Duplicate Registration message in English, so that I know my Event Pass was resent or where to find it.
18. As an Attendee, I want the "registration closed" message in English, so that I know registration has ended.
19. As an Attendee, I want the organisers' contact channels labelled in English, so that I can reach them.
20. As an Attendee using a screen reader, I want the English page to declare itself as English, so that it is read with English pronunciation.

### Attendee: my Event Pass in English

21. As an Attendee who registered in English, I want to land on my Event Pass in English, so that I can read the thank-you message and instructions.
22. As an Attendee, I want the Event Pass card in English ("Event Pass", "Pass Code", "If the QR won't scan, give this code", "Name", "Event Days"), so that I understand it.
23. As an Attendee, I want "Save Event Pass" to save an English card image when I'm on the English page, so that the picture I keep matches what I read.
24. As an Attendee opening my Event Pass link from the email or QR, I want the Thai page with the toggle, so that I can switch to English myself.
25. As an Attendee with a wrong Event Pass link under `/en`, I want the "Event Pass not found" page in English, with a 404, so that I know the link is broken.
26. As an Attendee, I want the English Event Pass page's tab title in English, so that I can find it among my tabs.

### Attendee: international phone numbers

27. As an Attendee from abroad, I want to enter my phone number with `+` and my country code, so that I can register without a Thai number.
28. As an Attendee, I want the phone field's hint and error to show both a Thai example and an international one, so that I know what's accepted.
29. As an Attendee with a Thai number, I want to type it as before (081-234-5678, or +66 81 234 5678), so that nothing changes for me.
30. As an Attendee, I want a too-short, too-long or `+`-less foreign number refused with a clear message, so that the organisers can reach me.
31. As an Attendee who registers twice with the same name and international number, I want to be recognised as already registered, so that I don't get a second Event Pass.

### Staff: an English Back Office

32. As Staff, I want the sign-in page, the forgot-password line and every sign-in error in English, so that the Back Office reads in one language from the start.
33. As Staff, I want the sidebar, page titles, menus, buttons and toasts in English, so that the Back Office is consistent.
34. As Staff, I want the Back Office to use the glossary's terms (Registration, Attendee, Attendee Role, Event Pass, Pass Code, Check-In, Event Day, Kiosk, Staff Account, Kiosk Account, Referral Source), so that we all use the same words.
35. As Staff, I want Attendee Roles, Referral Sources and Event Days shown in English (for example "Parent", "Sat 31 Oct"), so that the lists are readable in English.
36. As Staff, I want Attendees' names and free-text answers shown exactly as typed, Thai or not, so that I see what they wrote.
37. As Staff, I want Thai names still sorted in Thai dictionary order, so that finding people stays easy.
38. As Staff, I want dates and times as "23 Oct 2026, 14:05" in Bangkok time, so that times are unambiguous.
39. As Staff, I want numbers with thousands separators ("1,234"), so that counts are easy to read.
40. As Staff, I want the overview cards, the Attendee Role table and the daily chart in English, so that I can report the numbers.
41. As Staff, I want the Registration list's search, filters, columns, empty states and pagination in English, so that I can work the list.
42. As Staff, I want a Registration's detail page and its delete confirmation in English, so that I can act on it.
43. As Staff, I want the resend and bulk-send flows, their summaries, pauses, failures and toasts in English, so that I can manage Event Pass emails.
44. As Staff, I want the change-password page in English, so that I can change my password.
45. As Staff, I want an international phone number shown as stored (+447700900123), and a Thai one as before, so that I can call the Attendee.
46. As Staff, I want search by phone to find an international number, so that I can look up any Attendee.
47. As Staff, I want the CSV export's headers and option values in English, still UTF-8 with BOM, so that it opens in Excel with Thai names intact.

### Staff: check-in desk and Kiosk

48. As Staff at the check-in desk, I want the desk (day choice, Pass Code entry, results, camera controls and errors) in English, so that I can check people in.
49. As Staff, I want the desk's Kiosk mode and the Kiosk page to keep their Thai and English instructions for Attendees, so that every Attendee understands them.
50. As Staff, I want the Kiosk's corner button labelled "เจ้าหน้าที่ · Staff", so that I can find it and Attendees know it isn't for them.
51. As Staff, I want the panel behind that button (sign out, leave Kiosk mode, the day and screen-lock notes) in English, so that it matches the Back Office.
52. As Staff, I want camera problems on the Kiosk shown in Thai then English, so that whoever is at the Kiosk can understand them.

### Operator and organisers

53. As the organisers, I want to review all the English wording before it goes live, so that it reads well.
54. As the operator, I want no database migration for this, so that deploying is a plain rebuild.
55. As the organisers, I want the Event Pass email unchanged (Thai and English), so that every Attendee can read it whatever language they registered in.

## Implementation Decisions

### Languages and addresses

- **Two languages, Thai (`th`) and English (`en`), with Thai the default.**
  - Thai public pages keep their unprefixed addresses (`/`, `/p/:token`).
  - English pages live under `/en` (`/en`, `/en/p/:token`).
  - A Thai-prefixed address such as `/th/...` redirects to its unprefixed form.
  - No browser-language detection, and no remembered choice.
- **Routing follows Next 16's own internationalisation guide:**
  - Public routes sit under a language segment, with the languages listed as static params, so both languages prerender as now.
  - The Proxy maps unprefixed public paths to the Thai segment internally, and the address bar stays unprefixed.
  - The Proxy's existing Event Pass lookup (an unknown token gets a real 404) covers `/en/p/:token` too.
- **`<html lang>` per area:** `th` for Thai public pages, `en` for English public pages and the Back Office. The Kiosk page keeps `th`, with English lines marked `lang="en"` as now. This means separate root layouts per area.
- **Metadata:** title and description per language, with `hreflang` alternates pairing each Thai page with its English page. The Thai page is the `x-default`.

### Public wording (dictionaries)

- **Dictionaries:** one per language, hand-written, typed so both have exactly the same keys. A missing translation is a type error. No i18n library.
- **Server and client:** server components read the dictionary for the route's language. Client components get the strings they need from their server parent.
- **Pure modules take the language as a parameter:**
  - field validation, including messages and the organisation label
  - the "this Event Day has passed" message
  - the Attendee Role and Referral Source labels
  - Event labels: venue, date range and Event Day labels
- **The Event:** gains English venue, date-range and Event Day labels next to the Thai ones. English uses Gregorian years and English day names.
- **Submitting:** the registration Server Action receives the form's language and validates with that language's messages. A Duplicate Registration notice and a Turnstile problem come back in that language. A successful registration lands on the Event Pass page in the same language.
- **The Event Pass card and its PNG** render in the page's language: title, venue, date line, labels, Event Day labels, QR alt and file-save messages.
- **Turnstile** is told the page's language.
- **The footer's contact labels** and the "registration closed" contact list follow the page's language.

### The toggle

- **Markup:** a small `TH | EN` segmented switch at the top right of the public site header, on every public page. Each half is a link to the same page in that language, so it works without JavaScript.
- **Accessibility:**
  - The group has an accessible name ("เลือกภาษา" / "Choose language").
  - Each link's accessible name is its visible code, then the language's own name ("TH ภาษาไทย" / "EN English"), with matching `lang` and `hreflang`. Starting with the visible code lets a voice command such as "tap EN" find it (WCAG 2.5.3).
  - The current language has `aria-current`.
- **Keeping answers:** on the registration form, following the toggle first saves the current answers and visible errors to `sessionStorage`, for this tab only. The form in the other language restores them once, then clears them. Nothing is saved anywhere else.
- **The Event Pass page's toggle** keeps the token: `/p/:token` ↔ `/en/p/:token`.

### International phone numbers

- **Accepted formats:**
  - **Thai numbers:** unchanged. A 10-digit mobile or 9-digit landline starting with 0, or the same number written `+66 …`.
  - **International numbers:** `+`, then a country code other than 66, then digits, 8–15 digits in all (the E.164 maximum). Spaces and hyphens are allowed while typing.
  - A number without `+` that isn't a valid Thai number is refused.
- **Storage:** every number is stored as E.164, as now. No schema change (the column is plain text with no format constraint).
- **Duplicate Registration** is unchanged: same normalised given name, family name and E.164 phone.
- **Typing:** formatting as-you-type keeps today's Thai grouping. An international number is left as typed, apart from removing characters that aren't digits, spaces or hyphens.
- **Display:**
  - Back Office and CSV show a Thai number in local form, as now, and an international number as its E.164 string.
  - The CSV's existing E.164 column is unchanged.
- **Search:** searching by phone matches international numbers, as typed with or without `+`, spaces or hyphens.
- **Copy:** the phone field gains a hint in both languages, and its error message names both formats (see the copy deck).

### English Back Office

- **No toggle.** Back Office strings are written in English directly in the code, with no dictionary.
  - This covers the sign-in page, every signed-in page, the account menu, the change-password page and toasts.
  - It also covers the screen-reader-only strings in the shared UI primitives used by the Back Office: sheet, sidebar, breadcrumb and Toaster.
  - The Back Office title template becomes "… · Back Office · STEM Racing Thailand 2026".
- **Attendee answers** shown in the Back Office use the English Attendee Role, Referral Source and Event Day labels. Names and free text are shown as typed.
- **Formats:** Bangkok time, English month names, Gregorian years, 24-hour clock. Examples:
  - "23 Oct 2026, 14:05" for timestamps
  - "23 Oct" for the chart axis
  - "Fri 23 Oct 2026" for the chart tooltip
  - "Friday 23 October 2026" for the screen-reader table
  - Counts use thousands separators.
  - People counts read "1 person" / "N people". Email counts read "1 email" / "N emails".
- **Name sorting** keeps the Thai ICU collation.
- **CSV:**
  - Headers and option values are in English.
  - Event Days are written as English labels. Timestamps keep the Bangkok format, now in English.
  - The file stays UTF-8 with BOM, and the filename is unchanged.
- **Check-in result headings** are shared by the desk and the Kiosk:
  - The desk shows the English heading and English details.
  - The Kiosk keeps the Thai heading with the English note, as now.
  - The English headings for Staff are worded for Staff ("Checked in"), not for the Attendee ("You're checked in").
- **Camera scanner messages:** English at the desk, Thai then English on the Kiosk.
- **The Kiosk:**
  - Its Attendee-facing screens are unchanged.
  - The corner button reads "เจ้าหน้าที่ · Staff".
  - The Staff panel behind it is English.
  - The "Staff must sign in again" screen stays Thai with English, because Attendees see it.
- **Unchanged:** the Event Pass email, and operator command output (`npm run staff`, `npm run seed`, `npm run migrate`, already English).

### Unchanged

- The database schema.
- Registration rules, other than phone formats.
- The Event Pass email.
- QR content and Event Pass links.
- The Kiosk's Attendee-facing screens.
- Access rules (ADR 0003).
- Rate limits.

## Testing Decisions

- **What a good test is here:** it checks behaviour through each module's public interface, with expected values written as literals from the copy deck and the rules above, never recomputed. UI isn't an agreed seam.
- **Seams:** the existing ones only.
  - **Field validation (pure module).** Prior art: the existing field tests.
    - Phone rules: a Thai mobile, a Thai landline, `+66`, a valid international number, too short, too long, and a foreign number without `+`.
    - Validation messages for every field in Thai and in English.
    - The organisation label for each Attendee Role, in both languages.
    - Formatting as-you-type for an international number.
  - **The Registration module, against a real database** (a fresh database per file, `reset()` in `beforeEach`). Prior art: the registrations and duplicates tests.
    - An international number registers and is stored as E.164.
    - The same name with the same international number is a Duplicate Registration.
    - An English submission's validation problems come back in English.
  - **Search** (Registration module): an international number is found as typed with or without `+`, spaces or hyphens. Prior art: the search tests.
  - **CSV (pure module):** English headers, English Attendee Role, Referral Source and Event Day values, Thai names intact, BOM kept, and an international phone in both phone columns. Prior art: the CSV tests.
  - **The Event's labels:** the English Event Day labels and date range for each Event Day.
- **No automated UI tests.** Each ticket's hand-off records a check against `next start` (scratch database, no real SMTP):
  - **Public:**
    - `/` and `/en` render in their language, with `<html lang>`, titles and `hreflang`
    - the toggle on each public page, at 375 and 1280 px, with and without JavaScript
    - switching mid-form keeps answers and translates the visible errors
    - an English registration lands on `/en/p/:token`, and the English card and PNG
    - an unknown `/en/p/x` gives an English 404
    - a Duplicate Registration and "registration closed" in English
    - an international number registers
  - **Back Office:**
    - every page has no Thai left, except Attendee-entered data and the Kiosk's Attendee-facing screens
    - CSV opened and checked
    - the desk in English
    - the Kiosk corner button and Staff panel
- **Gate:** `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` pass before each commit.

## Out of Scope

- Storing an Attendee's language, or sending an English-first email or `/en` Event Pass links.
- Detecting the browser's language, or remembering the choice between visits.
- Any third language.
- A Thai toggle for the Back Office.
- Translating what Attendees typed (names, organisation, team, needs, comments).
- Changing the Kiosk's Attendee-facing screens or the Event Pass email.
- Changing operator commands or `docs/deploy.md` (already English).
- An i18n library.

## Further Notes

- **GLOSSARY:** unchanged. "admin" resolved to the Back Office and Staff, which the glossary already defines; "Admin" stays reserved.
- **ADR:** none. Nothing here is hard to reverse.
- **The wording** in the copy decks is a draft for the organisers to review. The glossary terms are fixed; the rest can change in review without touching this spec.
- **Decided while writing the spec, not in the grilling. Flag either if wrong:**
  - camera messages on the Kiosk become Thai then English
  - Staff-facing check-in headings at the desk say "Checked in" rather than the Attendee's "You're checked in"
- **Suggested ticket order:**
  1. Language routing, the toggle and the English public pages.
  2. International phone numbers. These touch the form's copy, so they come after or with the first.
  3. The English Back Office, which may be split by area: shell, list and detail; check-in desk and Kiosk Staff parts; email, sign-in, password and CSV.

  `/to-tickets` decides the split.
