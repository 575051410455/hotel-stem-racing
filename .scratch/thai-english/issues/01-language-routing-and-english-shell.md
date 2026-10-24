# 01: Language routing, the TH | EN toggle and the English page shell

**What to build:** Public pages exist in Thai at their current addresses and in English under `/en`, with a `TH | EN` toggle at the top right of every public page.
- Public routes move under a `[lang]` segment (`th`, `en`) listed as static params, following Next 16's internationalisation guide. The Proxy rewrites unprefixed public paths to `th` (the address bar stays unprefixed), redirects `/th/…` to the unprefixed form, and runs the Event Pass lookup for `/en/p/:token` too.
- Separate root layouts per area: public (`<html lang>` from the segment), Back Office and Kiosk (both stay `th` until tickets 06–09).
- Hand-written dictionaries for Thai and English, typed so both have the same keys. This ticket fills the page shell: header (skip link, logo link name, toggle), footer contact labels, the registration page's title, description, heading, introduction, date and venue, its loading text, "registration closed" and the "Event Pass not found" page.
- The Event gains English venue, date-range and Event Day labels; Event label helpers take the language.
- The registration form itself and the Event Pass page body stay Thai on `/en` until tickets 02 and 03.

See the spec ("Languages and addresses", "The toggle") and `copy-public.md` ("The Event", "Language toggle", "Site header and footer", "Registration page", "Registration closed", "Event Pass page" not-found rows).

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] **Addresses:**
  - `/` and `/p/:token` render Thai, `/en` and `/en/p/:token` render English; `/th`, `/th/…` redirect to the unprefixed path (query kept).
  - An unknown or malformed token gets a real 404 under both `/p/` and `/en/p/`, with the not-found page in the matching language.
  - Any other unknown public path is a 404 in the public layout, Thai unless under `/en`.
  - `/admin…`, `/kiosk…` and `/api…` behave as before (the session-cookie gate is unchanged).
- [x] **Root layouts:** `<html lang="th">` on Thai public pages, `lang="en"` on English ones; the Back Office and Kiosk keep `lang="th"` for now. Both languages of the registration page still prerender (`◐`), and `/p/unknown` stays a prerendered 404.
- [x] **Toggle:**
  - At the top right of the header on every public page, visible at 375 and 1280 px, easy to tap.
  - Each half is a plain link to the same page in that language (`/` ↔ `/en`, `/p/:token` ↔ `/en/p/:token`), so it works before scripts load.
  - The group is named "เลือกภาษา" / "Choose language"; the links are named "ภาษาไทย" / "English" with matching `lang` and `hreflang`; the current language has `aria-current`.
- [x] **Metadata:** title and description per language; the registration page pairs `/` and `/en` with `hreflang` alternates, Thai as `x-default`.
- [x] **English shell on `/en`:** header, footer contact labels ("Call {number}", "Contact the organisers"), heading, introduction, "31 October – 1 November 2026 · Grand Richmond Hotel, Nonthaburi", loading text and "Registration is closed" match `copy-public.md`.
- [x] **The Event:** English Event Day labels "Saturday 31 October 2026" and "Sunday 1 November 2026" and the English date range, tested; Thai labels unchanged. Back Office and email callers keep the Thai labels.
- [x] typecheck, lint, test and build pass. The hand-off records a check against `next start`: both languages render with the right `<html lang>`, titles and alternates; the toggle on each public page at 375 and 1280 px; `/th` redirects; unknown tokens give 404 in both languages; a Thai registration still lands on its Event Pass.

## Answer

Done on branch `thai-english-01-routing`.

### What's where

| What | Where |
| --- | --- |
| Languages (`th` default, `en`), `languagePath`, `splitLanguagePath`. Pure; used by the Proxy and the toggle | `src/lib/language.ts` |
| English venue, date range and Event Day labels; `eventDayLabel(date, language)`, `eventDateRangeLabel`, `eventVenue`. `EventDay.label` is now `{ th, en }` | `src/lib/event.ts`, tested in `src/lib/event.test.ts` |
| Public routes under the language segment, with `generateStaticParams` (th, en). The root layout holds `<html lang>`, header and footer | `src/app/[lang]/` |
| Dictionaries: `th.ts` is the source of keys, `en.ts` is typed `Dictionary`; `currentLanguage()` reads `next/root-params` | `src/app/[lang]/_dictionaries/` |
| Proxy: Staff areas keep the cookie gate; public paths rewrite to `/th/…`, `/th/…` redirects, Event Pass lookup in both languages, matcher on every page address | `src/proxy.ts` |
| Toggle (client, `usePathname`), in the header behind `<Suspense>` with a fallback to the registration page | `src/components/site/LanguageToggle.tsx`, `SiteHeader.tsx` |
| Back Office and Kiosk root layouts (`lang="th"` for now) | `src/app/admin/layout.tsx`, `src/app/kiosk/layout.tsx` |
| Unknown public paths: a catch-all that calls `notFound()`, so the 404 has the public layout and language | `src/app/[lang]/[...missing]/page.tsx`, `src/app/[lang]/not-found.tsx` |
| `contactChannels(language)`: "โทร …" / "Call …" | `src/lib/contact.ts` |
| `APP_URL` as a build arg, for the absolute `hreflang` links | `Dockerfile`, `docker-compose.yml`, `docs/deploy.md` |

### Decisions

- **Thai stays in the code paths the later tickets own.** Every Back Office, CSV, email, form and Event Pass caller passes `"th"` (or reads `label.th`) explicitly, so tickets 02, 03 and 06–09 switch them by changing one argument. The email now reads its English venue from `eventVenue("en")` (same text as before).
- **`hreflang` only on the registration page**, and only when `APP_URL` is set at build time. Next resolves relative alternates against `http://localhost:3000` otherwise, so they are left out rather than wrong. The Event Pass page is `noindex`, so it has none. The PPR resume renders metadata again at request time: build and runtime must use the same `APP_URL` (Compose reads both from `.env`), or the browser ends up with two sets of links.
- **The toggle reads the address** and strips `/th` or `/en`, so the Proxy's internal rewrite never leaks into a link. On the Event Pass page the address is request-time, so the toggle streams; the Suspense fallback links to `/` and `/en` (seen only with JavaScript off, where the Event Pass itself doesn't stream in either).
- **The toggle links are plain `<a>`**: the other language is a different root layout, so it is a full page load anyway.
- **Accessible names follow the spec** ("ภาษาไทย" / "English" with visible "TH" / "EN"). This doesn't strictly meet WCAG 2.5.3 (label in name) for voice control. Flag if the organisers want "TH ภาษาไทย" instead.
- **New copy:** a generic "Page not found" for other unknown public addresses, added to `copy-public.md` as **new** rows for review.
- `/th/en` redirects to `/en` (the path after `/th` is taken as is).

### Verified

- typecheck, lint, 224 tests and build pass. `/th` and `/en` are `◐`, `/th/p/unknown` and `/en/p/unknown` are `○` with status 404.
- **Addresses (curl against `next start`, scratch copy of the demo database):** `/` 200, `/en` 200, `/th` → `/`, `/th/p/:token?x=1` → `/p/:token?x=1` (query kept), real token 200 under `/p/` and `/en/p/`, malformed and unknown tokens 404 under both, `/xyz` and `/en/xyz` 404, `/admin` and `/kiosk` → sign-in, `/admin/login` 200, `/api/back-office/registrations` 401, `/brand/banner.jpg` 200.
- **Headless Chrome (24 checks, all pass, no console errors):**
  - `/` Thai and `/en` English: `<html lang>`, title, meta description, h1, introduction, date and venue, skip link, logo link name and href, footer list name and "Call 02-123-4567" / "โทร 02-123-4567" (built with test contact values).
  - Toggle on both: hrefs, `hreflang`, `lang`, names, `aria-current="page"` on the current half; following it is a full load into the other language.
  - `hreflang` alternates: one set, absolute, Thai as `x-default`.
  - `/p/:token` and `/en/p/:token`: the toggle keeps the token, with the current language marked.
  - 404 pages in the right language and layout: Event Pass not found (both), Page not found (both, with its tab title).
  - A Thai registration through the form lands on `/p/:token` with the QR.
  - `/admin/login` is `lang="th"` with no public header.
  - At 375 and 1280 px on `/en` and `/p/:token`: no sideways scroll; each toggle half at least 44 × 40 px and inside the viewport.
  - JavaScript off: `/en`'s toggle is plain links.
- **Not checked live:** "Registration is closed" in English. It needs the clock past 1 November; it is the same component with the dictionary's copy.
