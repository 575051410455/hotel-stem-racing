# Spec: STEM Racing Thailand 2026 — Attendee Registration v1

Status: ready-for-agent

Vocabulary follows `GLOSSARY.md`. Respects ADR 0001 (Better Auth on Drizzle + PostgreSQL, self-hosted with Docker Compose) and ADR 0002 (Attendees register without Accounts).

## Problem Statement

The organisers of STEM Racing Thailand 2026 (31 October – 1 November 2026 / 2569, Grand Richmond Hotel, Nonthaburi) need to know who is coming to watch and support the Competing Teams, in what Attendee Role and on which Event Day, so they can plan for the crowd. On the day, they also need a fast way to check people in at the entrance. Today all they have is a draft Google Form. It gives an Attendee nothing to show at the door, gives Staff no way to check anyone in, and offers no working view beyond a spreadsheet.

Attendees are parents, teachers, students, sponsors and others, and they mostly register on a phone from a link shared on Facebook or LINE. They will not create an account and password for a one-off visit. They want to register in under a minute and get something they can show at the door. Families often share one parent's email and phone number.

Registration has to open on **23 October 2026**, eight days before the Event.

## Solution

A single web app, in Thai, with three surfaces.

1. **Public registration** at `/`. Anyone can fill in the organisers' form with no Account. On submit they go straight to their **Event Pass** (QR + Pass Code) at `/p/{token}`, and the same Event Pass is emailed to them automatically.
2. **Back Office** at `/admin/*`, for Staff only. Staff sign in, search and filter Registrations server-side, see head counts per Event Day by Attendee Role, view and delete Registrations, export CSV, and resend Event Pass emails one at a time or in bulk.
3. **Check-In** in the Back Office. Staff scan Event Passes with a phone camera, or an iPad runs in **Kiosk** mode with the front camera so Attendees scan themselves. The rules cover first scans, repeat scans, wrong-day arrivals and non-pass QR codes.

Delivery is phased:
- **Phase 1** (live 23 Oct): public form, Event Pass page, automatic email, bot protection, deployment.
- **Phase 2** (24–25 Oct): Back Office.
- **Phase 3** (before 31 Oct): Check-In and Kiosk.

## User Stories

### Attendee: registering

1. As an Attendee, I want to open the registration form from a short link shared on Facebook or LINE, so that I can register on my phone in seconds.
2. As an Attendee, I want to register without creating an Account or password, so that a one-off visit doesn't cost me credentials I'll forget.
3. As an Attendee, I want to see the Event name, dates and venue at the top of the form, so that I know I'm registering for the right Event.
4. As an Attendee, I want separate fields for given name and family name, so that Staff can find me quickly at the door.
5. As an Attendee with a Thai name such as "วิชัย", I want names with Thai vowels and tone marks accepted, so that I'm not told my own name has invalid characters.
6. As an Attendee, I want to type my phone number with or without dashes, spaces or a +66 prefix, so that I don't have to guess the expected format.
7. As an Attendee, I want my phone number formatted as I type (e.g. 081-234-5678), so that I can check it at a glance.
8. As an Attendee with a landline, I want a 9-digit Thai landline number accepted, so that I can register without a mobile.
9. As an Attendee, I want my email checked for obvious typos, so that my Event Pass email reaches me.
10. As an Attendee, I want to choose my Attendee Role (Parent, Teacher, Student, Sponsor, Other), so that the organisers know who is coming.
11. As an Attendee choosing "Other", I want to type my role, so that I'm described accurately.
12. As an Attendee, I want to optionally name my school, institution, company or organisation, so that the organisers can see which communities are coming.
13. As a Sponsor, I want the organisation field to become required and be labelled "บริษัท / องค์กรที่ท่านเป็นตัวแทน", so that I'm asked for my organisation once, not twice.
14. As an Attendee, I want to choose one or both Event Days, so that the organisers can plan each day's crowd.
15. As an Attendee registering on the morning of an Event Day, I want that day still selectable, so that I can register as a walk-in.
16. As an Attendee, I want Event Days that have already ended hidden, so that I can't register for a day that's over.
17. As an Attendee arriving after the last Event Day has ended, I want to see that registration is closed, so that I'm not left with a broken form.
18. As an Attendee, I want to tick every channel through which I heard about the Event, and type one if it's "Other", so that the organisers learn what works.
19. As an Attendee, I want to optionally name the Competing Team I'm coming to cheer, so that the organisers know who supports whom.
20. Retired (2026-10-25): this field is no longer collected.
21. As an Attendee, I want to leave a question or suggestion, so that I can reach the organisers.
22. As an Attendee, I want each field's error shown in Thai when I leave the field, and re-checked as I type after an error, so that I can fix mistakes as I go.
23. As an Attendee, I want required fields clearly marked, so that I know what I must fill in.
24. As an Attendee who presses submit with mistakes, I want the cursor moved to the first invalid field, so that I can fix it immediately.
25. As an Attendee, I want the bot check to stay out of my way, so that registering is still quick.
26. As an Attendee, I want to read and acknowledge the PDPA notice after the optional comments field before submitting, so that I know how my Registration data will be used. See the [PDPA acknowledgment spec](../pdpa-registration-acknowledgment/spec.md) for both languages, policy link and evidence rules.
27. As an Attendee, I want the form usable from a 320px-wide phone up to a desktop, with no sideways scrolling, so that any device works.
28. As a keyboard or screen-reader user, I want a skip link, real labels, announced errors and visible keyboard focus, so that I can register without a mouse.

### Attendee: the Event Pass

29. As an Attendee, I want to land on my Event Pass right after submitting, so that I have it immediately.
30. As an Attendee, I want my Event Pass to show the QR, Pass Code, my name and my Event Days, so that I can check it's mine and for the right days.
31. As an Attendee, I want my Event Pass page not to show my email or phone, so that sharing the link doesn't expose my contact details.
32. As an Attendee, I want to bookmark or screenshot my Event Pass, so that I can show it at the door without signal.
33. As an Attendee, I want to download my Event Pass as an image file named after my Pass Code, so that I can save or print it.
34. As an Attendee, I want my Event Pass emailed to me, in Thai first with English alongside, so that I have a copy even if I close the page.
35. As an Attendee reading the email in Gmail or Outlook, I want the QR and images visible without clicking "show images", so that the pass is usable straight away.
36. As an Attendee, I want the email to include a raw link as well as a button, so that I can open my pass even if the button doesn't work.
37. As an Attendee, I want the Event dates and times in the email shown in Bangkok time wherever I am, so that I'm not confused about when to come.
38. As an Attendee whose QR won't scan, I want a Pass Code with no look-alike characters (no O/0/I/1), so that Staff can type it without errors.
39. As a parent, I want to register myself and each of my children separately using my own email and phone, so that children without email can still attend.
40. As an Attendee who lost my pass and submits the form again with the same name and phone, I want to be told I'm already registered and have my Event Pass re-sent to my registered email (shown masked, e.g. j***@gmail.com), so that I can recover it without anyone else being able to see it.
41. As an Attendee, I want re-sends limited so that nobody can flood my inbox by re-submitting my details.
42. As an Attendee who needs to change or cancel a Registration, I want the organisers' contact channels shown, so that I know whom to ask.

### Attendee: at the door

43. As an Attendee at a Kiosk, I want to hold my Event Pass up to the iPad's front camera and see a mirrored preview with instructions in Thai and English, so that I can check myself in.
44. As an Attendee who registered for one Event Day but comes on the other, I want to still be let in, so that a scheduling change doesn't send me home.
45. As a walk-in without a Registration, I want to scan a poster QR, register on my phone and then be checked in, so that I can still attend.

### Staff: signing in

46. As Staff, I want to sign in to the Back Office at `/admin/login` with email and password, so that only the organising team sees Registrations.
47. As Staff, I want no link to the Back Office anywhere on the public pages, so that Attendees aren't shown a sign-in they can't use.
48. As the operator, I want Staff Accounts created and passwords reset with a command on the server, and no public sign-up, so that only people we choose get in.
49. As Staff, I want a password of at least 12 characters with no composition rules, so that I can use a memorable passphrase.
50. As Staff, I want repeated failed sign-ins slowed down, so that nobody can guess our passwords.
51. As Staff running a Kiosk for two days, I want my session to last at least through the Event, so that the Kiosk doesn't sign itself out mid-event.
52. As Staff, I want every Staff member to have the same permissions, so that we don't spend Event week managing roles.

### Staff: working with Registrations

53. As Staff, I want a paginated list of Registrations, newest first, so that I can see who has registered.
54. As Staff, I want to search by name, phone, email or Pass Code, so that I can find one Attendee fast.
55. As Staff, I want to filter by Event Day and Attendee Role, so that I can focus on one slice.
56. As Staff, I want to sort the list by its columns, so that I can scan it in a useful order.
57. As Staff, I want search, filters, sort and page kept in the URL, so that refreshing, going back or sharing a link keeps my view.
58. As Staff, I want the list to stay usable while the next page loads, so that the table doesn't flash empty.
59. As Staff, I want head counts per Event Day broken down by Attendee Role, so that we can plan staffing and seating.
60. As Staff, I want to open a Registration and see every answer, including comments, so that we can review questions or suggestions.
61. As Staff, I want to delete spam or Duplicate Registrations, so that counts stay accurate.
62. As Staff, I want to export the Registrations matching my current filters as a CSV that opens in Excel with Thai intact, so that I can share lists with the venue.
63. As Staff, I want to see whether each Attendee's Event Pass email was sent and how many times, so that I know who may be missing their pass.
64. As Staff, I want to resend one Attendee's Event Pass email, so that I can help someone who calls us.
65. As Staff, I want to bulk-send Event Pass emails to everyone or only to those not yet sent, so that I can recover after an outage or quota limit.
66. As Staff, I want a summary of how many emails will go out, per Event Day, before a bulk send starts, so that I don't send by mistake.
67. As Staff, I want a bulk send to proceed in small batches with visible progress, so that it doesn't time out or stall silently.
68. As Staff, I want the Back Office in Thai, so that the whole team can use it.

### Staff: Check-In

69. As Staff at the entrance, I want to scan an Event Pass with my phone's camera anywhere in the frame, so that I don't have to line the QR up carefully.
70. As Staff, I want to switch between front and back cameras, so that I can use whichever fits the setup.
71. As Staff, I want my device to remember which camera I picked, so that I don't re-select it every time.
72. As Staff whose camera switch fails, I want an error and my previous camera restored, so that scanning isn't interrupted.
73. As Staff, I want a clear success result when an Attendee is checked in for today, so that I can wave them through.
74. As Staff, I want an amber "already checked in at HH:MM" result on a repeat scan the same day, so that I notice shared or reused passes.
75. As Staff, I want a warning when an Attendee is checked in on an Event Day they didn't register for, so that I can decide on the spot while the visit is still recorded.
76. As Staff, I want a brief, silent orange notice when the camera reads a QR that isn't an Event Pass (a menu or poster), and scanning to carry on, so that stray QR codes don't block the queue.
77. As Staff, I want the same stray QR not to trigger repeated notices within 10 seconds, so that the screen isn't spammed.
78. As Staff, I want to type a Pass Code when a QR won't scan, in any case and with or without spaces or dashes, so that nobody is turned away by a damaged screenshot.
79. As Staff, I want Event Pass QR codes made under an old domain to keep working, so that changing the domain never invalidates passes.
80. As Staff, I want to put an iPad into Kiosk mode with the front camera, a mirrored preview and Attendee-facing instructions, so that Attendees can check themselves in.

### Operator

81. As the operator, I want to deploy the app, database and nginx with Docker Compose on our Ubuntu server, so that we own the stack.
82. As the operator, I want HTTPS through Cloudflare's proxy using a Cloudflare Origin Certificate in nginx, so that there are no certificate renewals to manage. _(Changed 2026-10-24: visitors come through a Cloudflare Tunnel instead, with no published ports; ADR 0005.)_
83. As the operator, I want rate limits to use the real client IP that Cloudflare forwards, so that everyone behind Cloudflare isn't treated as one IP.
84. As the operator, I want all secrets and contact details configured through environment variables documented in an example file with Cloudflare Turnstile test keys, so that the app runs locally before real keys exist.
85. As the operator, I want the app to launch and accept Registrations even if SMTP isn't configured yet, so that email setup can't block the 23 October launch.
86. As the operator, I want the domain to be a single setting that QR links are built from at render time, so that changing it later breaks nothing.
87. As the operator, I want the database on a persistent volume that rebuilding the app never touches, so that redeploying can't lose Registrations.

## Implementation Decisions

### Stack and boundaries
- **Next.js 16 (App Router)**, TypeScript strict, Tailwind CSS v4.
  - The scaffold enables Cache Components, and the Next.js agent note requires reading the docs bundled with the installed version before writing code. Follow those docs, not older conventions.
  - Next.js is used throughout. TanStack Start was considered and rejected.
- **PostgreSQL 17 + Drizzle ORM.**
- **Better Auth** for Staff only, with public sign-up disabled (ADR 0001). Attendees have no Accounts (ADR 0002).
- **Back Office:** TanStack Query, TanStack Table v9 in manual (server-driven) mode, and shadcn/ui. Table v9 is a new major version, so read its docs before using it.
- **Public pages** are hand-built and keep the original template's layout, spacing, single 735px breakpoint, focus model and accessibility rules. They use no form library: plain React state plus the shared pure validators.
- The template's Register/Sign In pill tabs, password field, title, date of birth/age gate, country and marketing opt-in are all removed.

### Brand and presentation
- The brand is STEM Racing Thailand × Grand Richmond, used with permission. The organisers will supply original logo files. Until then the header shows a text wordmark. The banner in the repo is the hero image on public pages.
- Colours: keep the template's light background and white surfaces, and replace its red accent with the magenta→orange brand gradient from the banner. A gradient bar replaces the template's "racing stripe".
- The UI is Thai only, Back Office included.
- Font stack, system fonts only, with no font files hosted (the SF Pro licence forbids web embedding): "SF Pro Text", "SF Pro TH", "SF Pro Icons", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, "Leelawadee UI", "Noto Sans Thai", sans-serif.
- Footer: logos, © 2026 STEM Racing Thailand, and the organisers' contact channels. Each channel is hidden when not configured.
- Canonical Thai copy comes from the organisers' form: intro text, field labels and thank-you message. The current bilingual PDPA notice and its versioning rule are in the [PDPA acknowledgment spec](../pdpa-registration-acknowledgment/spec.md).

### URLs (product contract)
- `/`: public registration form.
- `/p/{token}`: public Event Pass page.
- `/admin/login`: Staff sign-in.
- `/admin`: Registration list, counts, export, email actions.
- `/admin/check-in`: scanner, including Kiosk mode.
- Back Office data is served by Staff-only endpoints that accept `q`, `day`, `role`, `sort`, `page` and `pageSize` and return a page of results plus the total. CSV export accepts the same filters.

### Event configuration
- Event Days are 2026-10-31 and 2026-11-01, Asia/Bangkok time.
- An Event Day stays selectable until it ends (end of day, Bangkok time), so same-day walk-ins can register.
- Registration closes when the last Event Day ends.

### Modules
- **Registration module** (the main seam; deep module). It owns every rule below and depends on injected collaborators: database, clock, Event Pass email sender, bot-check verifier. Interface:
  - **submit a Registration** → one of: accepted with its Event Pass; Duplicate Registration with masked email and whether a re-send happened; field errors keyed by field with Thai messages; bot check failed; registration closed.
  - **get an Event Pass by token** → name, Pass Code, Event Days, or not found.
  - **check in** from scanned or typed text for an Event Day → one of: checked in; already checked in (with time); checked in on a non-registered day (flagged); not an Event Pass.
  - **search Registrations** (server-side search, filters, sort, pagination) and **counts per Event Day by Attendee Role**.
  - **delete a Registration**.
  - **resend Event Pass email** for one Registration, and a **bulk-send batch** (mode `all` or `unsent`, cursor after an id, batch of 25) returning results and the next cursor.
- **Field validation** (pure, shared by browser and server). Returns an empty result when valid, otherwise a Thai message per field.
- **Event Pass codec** (pure): Pass Code generation, normalisation, resolving scans, building Event Pass links from the configured domain.
- **Event Pass email** (pure builder plus sender). The builder returns subject, HTML and plain text. The sender never throws and returns success or an error.
- **Camera preference** (pure, separate from React): reads and writes the per-device camera choice.
- **Staff management command**: creates a Staff Account or resets its password from the server shell.

### Field rules
- **Given name, family name** (required, separate fields):
  - trimmed
  - Unicode letters **and combining marks**, so Thai vowels and tone marks pass (this fixes the template's letters-only rule)
  - groups joined by a single space, apostrophe or hyphen
  - at least two letters
- **Phone** (required):
  - Thai mobile: 10 digits starting 06/08/09
  - Thai landline: 9 digits starting 02–07
  - spaces, dashes and a +66 prefix are accepted
  - displayed formatted (e.g. 081-234-5678), stored in E.164 (+66…)
- **Email** (required): the template's email pattern.
- **Attendee Role** (required): Parent, Teacher, Student, Sponsor or Other. "Other" requires text.
- **Organisation** (optional): required, and relabelled, when the Attendee Role is Sponsor. This merges the original form's questions 5 and 6.
- **Event Days** (required, at least one): only days that have not ended. The server re-checks against the clock.
- **Referral Sources** (required, at least one): Facebook, Instagram, TikTok, LINE, Website, School/institution, Company/organisation, Friend/acquaintance, Competing Team, Other. "Other" requires text.
- **Competing Team cheered for, comments**: optional free text.
- Every text field has a sensible maximum length, enforced in the browser and on the server.

### Duplicate Registration
- Detected on trimmed, case-folded given name + family name + phone (E.164), backed by a unique database constraint.
- Shared email addresses or phone numbers alone are allowed (family members).
- On a duplicate:
  - no new record is created
  - the response says "ท่านลงทะเบียนแล้ว" and **never** shows the Event Pass
  - if SMTP is configured, the existing Event Pass is re-sent to the registered email, shown masked, at most once per 10 minutes per Registration
  - otherwise the organisers' contact channels are shown

### Event Pass
- **Token**: a random UUID v4. The QR encodes the link `{APP_URL}/p/{token}`, with any trailing slash trimmed. Only the token is stored; links are built at render time.
- **Pass Code**: `EP-` followed by 8 random characters from an alphabet without O, 0, I or 1. Token and Pass Code each have a unique index.
- **QR**:
  - error correction level M everywhere
  - browser renders it as SVG
  - email embeds a PNG (width 220, margin 2) as an inline CID attachment
- **Downloadable card**:
  - PNG 1024×1204 with an 80px quiet zone
  - Pass Code and Event Days printed under the QR
  - the file name is the Pass Code, never the token
  - when converting SVG for download, use URI-component encoding, not base64, because base64 conversion throws on Thai text
  - may slip from Phase 1 to Phase 2
- **Resolving a scan** accepts:
  - a bare token
  - a Pass Code, normalised to uppercase with spaces and hyphens removed
  - a URL, from which only the last two path segments are read and the host is ignored, so old-domain QR codes keep working
- The browser-side pass recogniser must always be looser than the server's (case-insensitive), so no real pass is discarded early.

### Check-In
- At most one Check-In per Registration per Event Day, enforced by a unique database constraint. Each Check-In records when it happened and which Staff Account was signed in.
- A repeat scan on the same Event Day records nothing new and reports the original time.
- Checking in on an Event Day the Attendee didn't choose is allowed, recorded, and flagged for Staff.
- **Scanner:**
  - Library: html5-qrcode.
  - Whole-frame reading: no scan box, QR format only, 10 fps, no "try harder" mode.
  - Camera switching:
    - use a non-exact front/back facing mode
    - always wait for the current stream to stop before starting the next (avoids black video on iPhone/iPad, WebKit bug 179363)
    - disable the switch and stop controls and show "Starting..." while switching
    - on failure, show an error, restore the previous camera and don't save the choice
- **Camera preference:**
  - stored per device, not per Account
  - the value "front" means front camera; anything else, or nothing stored, means back
  - every storage access is wrapped so private browsing works
- **Kiosk mode:**
  - front camera with the preview mirrored by CSS (scanning is unaffected)
  - instruction text "แสดง QR ของท่านที่กล้อง / Show your pass QR to the camera"
- **Non-pass QR:** an orange notice for 3 seconds, no sound, scanning continues. The same text is suppressed for 10 seconds.

### Email
- **Transport:**
  - nodemailer over SMTP with a Gmail or Google Workspace account (Workspace preferred)
  - pooled connections: max 10 connections, 100 messages per connection
  - `EMAIL_FROM` must be a verified alias, or Gmail rewrites the From address
  - quotas are roughly 500/day for personal Gmail and 2,000/day for Workspace
- **Sending on registration:**
  - sent after the Registration is saved
  - a send failure never fails the Registration; it is recorded as unsent
  - when SMTP isn't configured, sending is skipped entirely
  - each Registration records its sent count and last-sent time
- **Template:**
  - layout: a 600px white card (radius 12) on #f4f4f7
  - header: banner (resized to at most 300KB, inline CID) plus Event name
  - greeting in Thai then English
  - details table: Event, dates and times formatted as a range in Asia/Bangkok, venue, Attendee name
  - QR image plus Pass Code in large monospace, with "ถ้าสแกนไม่ได้ แจ้งรหัสนี้" ("If it won't scan, give this code")
  - a CTA button plus the raw link (word-break)
  - conditions as bullets, then a signature
- **Email HTML rules:**
  - table layout with inline styles only
  - VML fallback for Outlook backgrounds
  - button text colour chosen by contrast against the theme colour
  - all Attendee-entered text HTML-escaped
  - always include a plain-text part
- **Bulk send:**
  - modes `all` and `unsent` (sent count 0)
  - shows a summary per Event Day before starting
  - 25 messages per request, sent one at a time; the client requests the next batch with a cursor, which keeps each request under the proxy timeout

### Back Office
- Search, filtering, sorting and pagination run on the server.
- Search matches given name, family name, phone, email and Pass Code.
- Filter state lives in URL search params, validated with zod.
- TanStack Query keeps the previous page visible while the next page loads.
- CSV export: UTF-8 with BOM, all fields, respecting the current filters.
- Staff Accounts:
  - email/password, sign-up disabled
  - minimum 12 characters, no composition rules
  - Better Auth's built-in sign-in rate limiting
  - session lifetime of at least 7 days
  - no "forgot password" link; resets go through the server command
  - a single, equal permission level for all Staff

### Abuse protection
- Cloudflare Turnstile is verified on the server before a Registration is accepted.
- Per-IP rate limiting on submissions, held in memory (a single app container), keyed on the client IP that Cloudflare forwards.

### Data shape
Decision-level, not final column names:
- **Registration**: id, token (unique), Pass Code (unique), given name, family name, phone (E.164), email, Attendee Role, role-other text, organisation, chosen Event Days (one or more), Referral Sources (one or more) plus other text, Competing Team cheered for, comments, nullable PDPA acknowledgment time, event notice version and linked policy URL, email sent count, last email sent time, created time. Unique on the Duplicate Registration key. The event notice version changes when the notice wording changes; it is not a version of the hotel's external policy.
- **Check-In**: id, Registration, Event Day, checked-in time, Staff Account, flag for a non-registered day. Unique on (Registration, Event Day).
- **Staff auth**: Better Auth's own tables (users, sessions, accounts, verifications).

### Deployment
- Docker Compose on Ubuntu with four services _(three until 2026-10-24, when ADR 0005 added `cloudflared`)_:
  - **app**: Next.js standalone output
  - **db**: PostgreSQL 17 on a named volume
  - **nginx**: reverse proxy with a Cloudflare Origin Certificate behind Cloudflare's proxy, restoring the real client IP from Cloudflare's forwarded header for Cloudflare's IP ranges _(changed 2026-10-24: behind a Cloudflare Tunnel, trusting the header only from `cloudflared`; ADR 0005)_
  - **cloudflared**: keeps the Cloudflare Tunnel open, so the server publishes no port (ADR 0005)
- Environment variables, documented in an example file:
  - `APP_URL`
  - `DATABASE_URL`
  - Better Auth secret and URL
  - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` (Cloudflare test keys in the example)
  - SMTP host, port, user and password
  - `EMAIL_FROM`
  - `NEXT_PUBLIC_CONTACT_LINE` and `NEXT_PUBLIC_CONTACT_PHONE`
  - `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` _(added 2026-10-25)_: a fixed key for the Docker build, so Server Action IDs survive a deploy and open Kiosk and check-in pages keep working
- Local development uses Homebrew PostgreSQL 17 (there is no Docker on the dev machine).
- CI _(added 2026-10-25)_: GitHub Actions runs the four gates (typecheck, lint, test, build) and builds the Docker image on every push. Deploying stays manual: the server pulls and builds.

### Phasing
- **Phase 1, live 23 Oct:**
  - public form with all field rules
  - Duplicate Registration handling
  - Event Pass page
  - automatic email (env-gated)
  - Turnstile and rate limiting
  - deployment files
  - (the download card may slip)
- **Phase 2, 24–25 Oct:**
  - Staff sign-in and the Staff management command
  - list, search, filter, sort and pagination
  - counts, detail view, delete
  - CSV export
  - single and bulk email
- **Phase 3, before 31 Oct:** Check-In, scanner and Kiosk mode.

## Testing Decisions

- **A good test** exercises external behaviour through a module's public interface and asserts on outcomes an Attendee or Staff member would notice: the result returned, what a later call can see. It never asserts on SQL, internal helpers or call order. Fakes are used only at system boundaries: email transport, Turnstile verifier, clock.
- **Primary seam: the Registration module, tested against a real PostgreSQL 17 test database.** The real database is used because the key rules (unique token and Pass Code, Duplicate Registration, one Check-In per Event Day) are enforced by constraints. Each run gets a fresh schema and each test a clean slate. Scenarios:
  - **Submitting:**
    - a valid submission returns an Event Pass that can be fetched by token
    - each invalid field returns its Thai message
    - a Sponsor without an organisation is rejected
    - "Other" without text is rejected
    - an Event Day that has ended is rejected, and same-day registration is accepted
    - submitting after the last Event Day returns "closed"
    - a failed bot check is rejected
  - **Duplicates:**
    - a duplicate returns a masked email and no Event Pass
    - same email or phone with a different name is accepted
    - a duplicate re-send is throttled to once per 10 minutes
  - **Email:**
    - email failure still saves the Registration and records it as unsent
    - with SMTP not configured, nothing is sent and submission still succeeds
    - single resend and bulk batches respect `all` and `unsent`, cursors and batch size
  - **Check-In:**
    - first scan succeeds; a repeat scan returns the original time
    - a wrong-day arrival is recorded and flagged
    - a non-pass returns "not an Event Pass"
    - a typed Pass Code in lower case with spaces works
    - an old-domain URL works
  - **Back Office queries:**
    - search matches each searchable field
    - Event Day and Attendee Role filters combine
    - pagination totals are correct
    - counts per Event Day by Attendee Role are correct
    - delete removes a Registration from search and counts
- **Pure modules, unit tested without a database:**
  - **Field validation:** Thai names with vowels and tone marks ("วิชัย"), names with spaces, apostrophes and hyphens, too-short names, every phone format accepted or rejected, email typos.
  - **Event Pass codec:** Pass Codes use only the allowed alphabet; normalisation; resolving bare token, Pass Code and URL forms; links built from the configured domain with the trailing slash trimmed.
  - **Event Pass email builder:** HTML-escapes Attendee-entered text; includes the plain-text part, Pass Code and raw link; formats dates and times in Bangkok time.
  - **Camera preference:** defaults to back; only "front" selects front; storage that throws falls back to back.
- **Seams added later through tickets.** Each was agreed in its ticket; recorded here so the list stays complete.
  - Event Day availability (07): open days at given Bangkok instants.
  - CSV builder (15): BOM, quoting and the formula guard, checked against literal strings.
  - Turnstile siteverify response parsing (08).
  - Loose pass recogniser (18) and Kiosk-mode parameter (19).
  - Staff Accounts (04), against a real database: create, sign in, wrong password, short password, no public sign-up.
  - Bangkok time (22): the calendar date and clock time either side of midnight in Bangkok, and the instant of a Bangkok date and wall-clock time. The redesign spec (`.scratch/back-office-redesign/`) builds its "today" and daily counts on it.
- Pass Code generation is injectable (`generatePassCode`) only so collisions can be tested; treat it as a boundary like the clock.
- **Runner:** Node's built-in test runner executed through tsx, which handles TypeScript and path aliases.
- **Prior art:** none in the repo; it is greenfield. The organisers' notes established the patterns to follow: pure email builders returning subject/HTML/text, a sender that never throws, and a camera-preference module kept apart from React.
- **No browser end-to-end tests in v1** because of the deadline. Public pages get a manual check at 320, 734, 735, 1280 and 1600+ px widths, plus keyboard-only and screen-reader passes.

## Out of Scope

- Attendee Accounts, and Attendees viewing, editing or cancelling their own Registration (ADR 0002). Changes go through Staff.
- Capacity limits or closing registration per Event Day (Back Office only shows counts in v1).
- The data-retention policy under PDPA; the organisers decide this later.
- Staff password reset by email, Staff permission levels, Staff invitation flows.
- A selectable list of Competing Teams; v1 uses free text.
- English or bilingual UI and any i18n framework (the Event Pass email is the only bilingual surface).
- Registration for competitors or Competing Teams, hotel room booking, payments, merchandise.
- Importing responses from the Google Form; it was never opened to the public.
- Analytics charts beyond the per-day/per-role counts.
- Hosting or embedding SF Pro or any other font files.
- Browser end-to-end test automation.

## Further Notes

- **Timeline:** the spec was written on 22 Oct 2026, the public form goes live 23 Oct, and the Event is 31 Oct – 1 Nov. Scope cuts should come from later phases, never from Phase 1's field rules or Duplicate Registration handling.
- **Still needed from the organisers or operator** (none of these block writing code):
  - Turnstile site key and secret key
  - SMTP account and verified `EMAIL_FROM`
  - production domain (a subdomain of the organisers' domain, DNS on Cloudflare)
  - contact channels (LINE OA, phone)
  - original logo files
- **Repo state:** the Next.js 16.4 scaffold is installed but no application code exists yet. Homebrew PostgreSQL 17 is installed but not started, and no database has been created. The repo is not under git yet.
- **Origin of the UI:** the public-page styling derives from a generic motorsport-style auth template. No Formula 1 or other third-party marks, logos or proprietary fonts may be used.
