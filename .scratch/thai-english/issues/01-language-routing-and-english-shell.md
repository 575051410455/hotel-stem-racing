# 01: Language routing, the TH | EN toggle and the English page shell

**What to build:** Public pages exist in Thai at their current addresses and in English under `/en`, with a `TH | EN` toggle at the top right of every public page.
- Public routes move under a `[lang]` segment (`th`, `en`) listed as static params, following Next 16's internationalisation guide. The Proxy rewrites unprefixed public paths to `th` (the address bar stays unprefixed), redirects `/th/…` to the unprefixed form, and runs the Event Pass lookup for `/en/p/:token` too.
- Separate root layouts per area: public (`<html lang>` from the segment), Back Office and Kiosk (both stay `th` until tickets 06–09).
- Hand-written dictionaries for Thai and English, typed so both have the same keys. This ticket fills the page shell: header (skip link, logo link name, toggle), footer contact labels, the registration page's title, description, heading, introduction, date and venue, its loading text, "registration closed" and the "Event Pass not found" page.
- The Event gains English venue, date-range and Event Day labels; Event label helpers take the language.
- The registration form itself and the Event Pass page body stay Thai on `/en` until tickets 02 and 03.

See the spec ("Languages and addresses", "The toggle") and `copy-public.md` ("The Event", "Language toggle", "Site header and footer", "Registration page", "Registration closed", "Event Pass page" not-found rows).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] **Addresses:**
  - `/` and `/p/:token` render Thai, `/en` and `/en/p/:token` render English; `/th`, `/th/…` redirect to the unprefixed path (query kept).
  - An unknown or malformed token gets a real 404 under both `/p/` and `/en/p/`, with the not-found page in the matching language.
  - Any other unknown public path is a 404 in the public layout, Thai unless under `/en`.
  - `/admin…`, `/kiosk…` and `/api…` behave as before (the session-cookie gate is unchanged).
- [ ] **Root layouts:** `<html lang="th">` on Thai public pages, `lang="en"` on English ones; the Back Office and Kiosk keep `lang="th"` for now. Both languages of the registration page still prerender (`◐`), and `/p/unknown` stays a prerendered 404.
- [ ] **Toggle:**
  - At the top right of the header on every public page, visible at 375 and 1280 px, easy to tap.
  - Each half is a plain link to the same page in that language (`/` ↔ `/en`, `/p/:token` ↔ `/en/p/:token`), so it works before scripts load.
  - The group is named "เลือกภาษา" / "Choose language"; the links are named "ภาษาไทย" / "English" with matching `lang` and `hreflang`; the current language has `aria-current`.
- [ ] **Metadata:** title and description per language; the registration page pairs `/` and `/en` with `hreflang` alternates, Thai as `x-default`.
- [ ] **English shell on `/en`:** header, footer contact labels ("Call {number}", "Contact the organisers"), heading, introduction, "31 October – 1 November 2026 · Grand Richmond Hotel, Nonthaburi", loading text and "Registration is closed" match `copy-public.md`.
- [ ] **The Event:** English Event Day labels "Saturday 31 October 2026" and "Sunday 1 November 2026" and the English date range, tested; Thai labels unchanged. Back Office and email callers keep the Thai labels.
- [ ] typecheck, lint, test and build pass. The hand-off records a check against `next start`: both languages render with the right `<html lang>`, titles and alternates; the toggle on each public page at 375 and 1280 px; `/th` redirects; unknown tokens give 404 in both languages; a Thai registration still lands on its Event Pass.
