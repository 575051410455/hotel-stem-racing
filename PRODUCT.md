# Product

## Register

product

## Users

- **Attendees**: the public coming to cheer at STEM Racing Thailand 2026 National Finals (31 Oct – 1 Nov 2026, Grand Richmond, Nonthaburi). Parents, teachers, students, sponsors' staff and international guests. Mostly on a phone, often at the entrance or on the way, sometimes on a slow connection. They register once (no Account), then show their Event Pass QR at the door. Thai is the default; English is one tap away.
- **Staff**: organisers and hotel staff working the Back Office (Registration list, counts, export, email actions) and the check-in desk, on laptops and tablets, under time pressure on Event Days.
- **Kiosk**: a check-in-only device at the desk that Attendees face, in Thai with English.

## Product Purpose

Register Attendees quickly and check them in without queues. The public pages are a registration form and an Event Pass page; the Back Office lists, exports and checks in Registrations. Success: an Attendee registers in under two minutes in their own language, gets an Event Pass by email and on screen, and walks in after one scan.

## Brand Personality

Fast, youthful, welcoming. The energy of a youth motorsport final, carried by the magenta→orange brand gradient and italic display type, but the tone stays friendly and plain so a first-time visitor or a grandparent can finish the form. STEM Racing Thailand × Grand Richmond, co-branded with permission.

## Anti-references

- Formula 1 or any third-party motorsport marks, logos or proprietary fonts. The public styling derives from a generic motorsport auth template; it must not look like an official F1 property.
- Hosted or embedded SF Pro (its licence forbids web embedding). System fonts only.
- Hiding the language choice behind a menu: international guests must see `TH | EN` at once.
- Heavy dashboard chrome on the public pages; they are a form, not an app.

## Design Principles

1. **The task first.** Every public screen serves one job: register, or show the Event Pass. Nothing competes with that.
2. **Both languages are first-class.** Thai and English get the same layout, the same care and the same reachability at every width.
3. **Works at the door.** Assume a phone, one hand, bright light and a weak signal: big targets, no horizontal scroll, links that work before scripts load.
4. **Brand energy, plain words.** The gradient and the italic wordmark carry the excitement; the copy and the controls stay calm and familiar.
5. **One system, two surfaces.** Public pages are hand-built on the tokens in `globals.css`; the Back Office uses shadcn/ui on the same palette. Don't mix their vocabularies.

## Accessibility & Inclusion

- WCAG 2.1 AA across public pages and the Back Office, checked at 320, 375 and 1280 px.
- Keyboard focus rings always available (hidden only after pointer input); a skip link on every public page.
- Respect `prefers-reduced-motion` (globals.css reduces all transitions and animations).
- Language is marked with `lang` on the page and on each language link.
