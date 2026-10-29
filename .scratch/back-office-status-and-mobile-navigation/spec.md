# Full-panel Check-In status colors and icon-only mobile navigation

Status: ready-for-agent

Synthesized on 28 October 2026 from the organiser's accepted Q1–Q8. This is a follow-up to the deployed Staff Check-In redesign and the existing Back Office shell. Domain language follows the project glossary; Account boundaries and Check-In behavior remain governed by ADRs 0003, 0004 and 0006.

## Problem Statement

Staff need to recognize Check-In outcomes immediately at the entrance. The current desk gives the large right-hand result panel a neutral background and places outcome colors inside smaller message cards. The organiser wants green, yellow and red to fill the entire result panel, with clearly colored action buttons. Readiness, an unconfirmed preview, a recorded arrival, a repeat and a recovery problem must remain distinguishable.

The organiser supplied idle-page HTML while reporting missing status colors. That HTML establishes a neutral ready state with no previous result; it does not establish a production CSS failure after an actual outcome. This feature changes the agreed presentation rather than assuming that Docker or the stylesheet is broken.

On phones, Back Office navigation currently opens a drawer from the left. Its width-based mobile threshold can also send a landscape iPhone back to desktop-style sidebar navigation. The organiser wants a fixed glass navigation bar at the bottom, with icons only, consistent in both phone orientations. It must preserve every permitted destination, My Account, Sign out and the existing restrictions on Staff and Kiosk Accounts.

## Solution

Give the complete Staff Check-In result panel a background that communicates its current outcome. Keep idle and pending states neutral, use green for a newly recorded Check-In, yellow for an existing Check-In or a condition requiring recovery, and red for an invalid Event Pass. Preserve explicit text and icons, the wrong-day warning, deliberate confirmation and safe retry. Color action buttons consistently with their functions and keep them readable against every panel background.

Replace the sidebar on phones throughout the signed-in Back Office with a rounded, translucent, blurred glass bar fixed above the iPhone Home indicator. Show only icons in this bar, with accessible names and a blue active-page indicator. Admin Accounts receive the four existing section destinations and an Account control; Staff Accounts receive Check-In and Account. Account opens a bottom sheet containing My Account and Sign out. Hide the bar while the on-screen keyboard is open and restore it when the keyboard closes. Desktop and iPad retain the sidebar; the separate Kiosk and sign-in pages retain their current layouts.

## User Stories

1. As a Staff member, I want the status color to fill the complete right-hand Check-In panel, so that I can recognize an outcome without locating a small card.
2. As a Staff member, I want the idle desk to use a neutral background, so that readiness is not confused with a recorded arrival.
3. As a Staff member, I want inspection to stay neutral, so that looking up an Event Pass does not appear to admit its holder.
4. As a Staff member, I want an unconfirmed preview to stay neutral, so that I know arrival still requires Confirm Check-In.
5. As a Staff member, I want confirmation in progress to stay neutral, so that I wait for an authoritative result.
6. As a Staff member, I want a newly recorded Check-In to show a green panel, so that I can see that arrival was recorded.
7. As a Staff member, I want a successful last result retained with its Attendee and a clear Last result label, so that readiness for another Attendee does not erase the result I just obtained.
8. As a Staff member, I want the previous color and result replaced as the next pass is inspected, so that a previous green result cannot be mistaken for the next Attendee's admission.
9. As a Staff member, I want an existing Check-In to show a yellow panel and its original time, so that I can recognize a repeat without recording another arrival.
10. As a Staff member, I want an invalid Event Pass to show a red panel with an explicit explanation, so that I can ask for a valid pass.
11. As a Staff member, I want a wrong-day preview to retain a visible yellow warning before confirmation, so that I can make the admission decision deliberately.
12. As a Staff member, I want a confirmed wrong-day Check-In to show green with its warning still visible, so that I can distinguish the recorded outcome from the exception.
13. As a Staff member, I want session expiry to show a yellow panel and Sign in again, so that I can recover access without confusing it with an invalid pass.
14. As a Staff member, I want an unavailable Event Day to show a yellow panel and an actionable explanation, so that I can choose a usable day.
15. As a Staff member, I want failed inspection to show a yellow panel and Retry inspection, so that I can recover without treating the pass as invalid.
16. As a Staff member, I want uncertain confirmation to show a yellow panel explaining that arrival may already be recorded, so that I do not guess whether the write succeeded.
17. As a Staff member, I want Retry confirmation to keep the same pass and reviewed Event Day, so that recovery cannot silently check in another Attendee or another day.
18. As a Staff member, I want repeated confirmation to retrieve the authoritative original outcome, so that retry cannot add a duplicate Check-In.
19. As a Staff member, I want Confirm Check-In to be green with white text, so that the recording action is easy to find.
20. As a Staff member, I want Cancel to be white with a gray border and dark text, so that I can clearly dismiss an unconfirmed preview.
21. As a Staff member, I want Inspect pass, Scan next, Start camera and Sign in again to be blue with white text, so that normal actions have a consistent appearance.
22. As a Staff member, I want Retry confirmation, Retry inspection and Retry camera to be amber with dark text, so that recovery actions are easy to identify.
23. As a Staff member, I want camera switching and Turn off camera to be white with a gray border and dark text, so that camera controls remain distinct from admission.
24. As a Staff member, I want readable button text, visible boundaries and focus indicators on every status background, so that the color changes do not make controls difficult to use.
25. As a Staff member, I want pending actions to remain disabled against repeat submission, so that visual changes do not weaken input locking.
26. As a Staff member, I want status text, icons and screen-reader announcements retained, so that the outcome does not depend on color perception.
27. As a Staff member using a phone, I want navigation fixed near the bottom of the screen, so that I can change sections without opening the sidebar drawer.
28. As a Staff member using an iPhone, I want a translucent blurred glass bar with rounded corners, so that the navigation has the requested floating appearance.
29. As a Staff member, I want icons only in the bottom bar, so that the visible navigation stays compact.
30. As a Staff member using a screen reader, I want every navigation icon to have an accessible name, so that I can identify each destination without a visible label.
31. As a Staff member, I want the current section highlighted in blue and exposed as current to assistive technology, so that I know where I am.
32. As a Staff member, I want bottom navigation throughout the signed-in Back Office on phones, so that navigation does not change unexpectedly between pages.
33. As a Staff member, I want phone navigation to remain at the bottom in portrait and landscape, so that rotating my iPhone does not restore the sidebar.
34. As a Staff member using an iPad or desktop, I want the existing sidebar retained, so that the phone change does not replace the established larger-screen layout.
35. As a Staff member using an iPhone, I want the bar clear of the Home indicator and screen edges, so that its controls remain easy to tap.
36. As a Staff member, I want page content to leave room for the fixed bar, so that it cannot cover a result, input, table control or confirmation action.
37. As a Staff member, I want usable touch targets even when five icons are present, so that adjacent destinations are not easy to tap accidentally.
38. As a Staff member, I want glass navigation to remain readable over varying page content, so that the blur effect does not hide the controls.
39. As an Admin Account holder, I want bottom icons for Registrations, Check-In, Email, Accounts and Account, so that every existing section and my own Account remain reachable.
40. As a Staff Account holder, I want bottom icons for Check-In and Account, so that navigation matches my permitted work.
41. As a Staff member, I want Account to open a bottom sheet containing My Account and Sign out, so that replacing the sidebar does not remove those actions.
42. As a Staff member, I want the Account sheet to close correctly when I choose My Account or dismiss it, so that an overlay does not remain over the destination page.
43. As a Staff member using a keyboard or screen reader, I want the Account sheet to manage focus and dismissal correctly, so that I can enter and leave it predictably.
44. As a Staff member whose password was set by someone else, I want My Account and Sign out still reachable while ordinary section links are restricted, so that I can complete password recovery.
45. As an organiser, I want unknown or unauthorized Account states to receive no privileged navigation, so that loading the menu does not briefly expose Admin destinations.
46. As an organiser, I want existing server authorization enforced independently of navigation visibility, so that changing the menu does not change Account permissions.
47. As an Admin Account holder viewing a Registration detail, I want Registrations to remain the active section, so that the section context is clear.
48. As an Admin Account holder viewing Account management detail, creation or history, I want Accounts to remain active, so that nested pages retain their section context.
49. As a Staff member viewing My Account, I want the personal Account control distinguished from Admin Account management, so that those destinations are not confused.
50. As a Staff member entering a Pass Code, I want bottom navigation hidden while the on-screen keyboard is open, so that it does not crowd the input and preview.
51. As a Staff member editing another Back Office form, I want the same keyboard behavior, so that navigation is consistent beyond the Check-In desk.
52. As a Staff member, I want the bar restored after the keyboard closes, so that navigation remains available after input.
53. As a Staff member, I want scrolling and ordinary Safari browser controls to leave navigation usable, so that viewport changes are not mistaken for an open keyboard.
54. As a Staff member, I want rotating the phone or closing an Account sheet to leave navigation in a coherent state, so that no duplicate menu or invisible overlay traps interaction.
55. As an Attendee using the separate Kiosk, I want its full-screen layout and immediate Check-In preserved, so that Back Office navigation and confirmation changes do not appear on the Kiosk.
56. As an Attendee, I want my existing Event Pass and Registration preserved, so that this presentation update does not change admission data.
57. As a Staff member, I want the new controls checked on a real iPhone and the desk regression-checked on a real iPad, so that simulated dimensions are not the only evidence of usability.
58. As an organiser, I want rollout readiness reported separately from implementation, so that passing code checks is not mistaken for completed device acceptance.

## Implementation Decisions

- Modify the Staff Check-In presentation and signed-in Back Office navigation shell. Keep the Registration module, Account rules and authoritative Check-In operation behavior unchanged. No schema migration, new Account kind, new API contract or changed destination URL is required.
- The entire right-hand status panel, including padding and space around its content, owns the status background. Avoid leaving the original neutral outer panel around a small colored result card. Preserve the centered content and the existing landscape/two-column and narrow-screen result-first layouts.
- Derive appearance from the actual Staff Check-In flow and authoritative result. Do not create a second lifecycle, an independent success flag or a timer that changes admission meaning.

| Staff Check-In state | Full-panel background | Required distinction |
|---|---|---|
| Ready with no previous result | Neutral | Ready to scan next; no recorded outcome implied |
| Inspecting | Neutral | Lookup in progress; no Check-In being recorded |
| Preview | Neutral | Explicit Confirm Check-In still required |
| Confirming | Neutral | Wait for the authoritative outcome |
| Newly recorded Check-In | Green | Recorded outcome, Attendee and time |
| Ready with a previous successful result | Green | Readiness separate from the clearly identified Last result |
| Already checked in | Yellow | Original timestamp; Scan next without Confirm |
| Invalid Event Pass | Red | No valid pass resolved; Scan next |
| Session ended | Yellow | Sign in again; no stale confirmation replay |
| No usable Event Day | Yellow | Explanation and the existing route to choose a day |
| Inspection failed | Yellow | Retry inspection; no arrival recorded by inspection |
| Confirmation outcome uncertain | Yellow | A write may already exist; retain pass/day and Retry confirmation |

- A wrong-day preview has a neutral panel plus a visible yellow warning; confirmation in progress remains neutral. A confirmed wrong-day arrival has a green panel plus the persistent yellow warning. A repeated wrong-day arrival remains an existing Check-In, with its original time and warning.
- Starting a new inspection clears the previous result and its color immediately. Cancel and Scan next return to the established neutral ready state when they clear the active result. Successful confirmation retains the labeled last result until the next work replaces it. Do not change held-QR suppression or automatic readiness after success.
- Preserve explicit text and icons alongside color, English Staff copy, the persistent status-announcement region and useful focus. Keep all names, times, warnings and controls readable when the entire panel is colored.

| Action | Button appearance |
|---|---|
| Confirm Check-In | Green background, white text |
| Cancel | White background, gray border, dark text |
| Inspect pass, Scan next, Start camera, Sign in again | Blue background, white text |
| Retry confirmation, Retry inspection, Retry camera | Amber background, dark text |
| Switch camera, Turn off camera | White background, gray border, dark text |

- Apply the button palette to the Staff desk and its camera controls, with visible hover, focus and disabled states. Choose readable shades and boundaries against neutral, green, yellow and red panels. Scope these styles rather than changing the global button appearance or the separate Kiosk through a shared scanner.
- Preserve the existing single-active-Attendee and reviewed-day locks. Uncertain confirmation is not cancellable undo; inspection and manual Enter do not record arrival. A color or button change never grants authority to write or bypasses the current session.
- The signed-in Back Office shell owns the phone navigation mode and the corresponding content clearance. Show one navigation presentation at a time; remove the redundant phone drawer trigger when the bottom bar replaces it. Preserve the desktop/iPad sidebar, its Account menu and the Check-In desk's existing larger-screen collapse behavior.
- Use a phone layout decision that remains consistent across portrait and landscape, rather than relying solely on the old width threshold. Keyboard changes and Safari browser chrome must not cause a phone to oscillate between bottom navigation and sidebar. Keep public-page responsive conventions independent of this change. The precise responsive mechanism is an implementation choice to validate against the agreed phone/iPad behavior.
- Build the bottom bar as fixed, rounded glass navigation with a translucent background, backdrop blur and a clearly visible blue active state. Keep enough background opacity or a readable fallback when blur is unavailable. Its placement and content clearance include the iPhone safe area and adapt to rotation and short heights.
- The visible bottom bar contains icons only. Retain accessible names, current-page semantics, visible keyboard focus and usable touch targets. Names in assistive technology are required; visible labels are intentionally omitted. The Account sheet may show the existing My Account and Sign out text.
- Share the existing destination definitions, permission rules and section matching between navigation presentations where practical. Admin Accounts receive Registrations, Check-In, Email, Accounts and Account; Staff Accounts receive Check-In and Account. Keep Registrations active on Registration detail and Accounts active on Account management subpages. Personal My Account belongs to the Account control, not the Accounts management section.
- Read the current Account through the established server-side session helpers and request-time boundaries. While the Account is unknown, do not show privileged links by default. Preserve My Account and Sign out access for the must-change-password case while suppressing the ordinary section destinations that remain forbidden. Pages, Server Actions and API interfaces retain their own authorization.
- The Account icon opens a bottom sheet. Preserve the current Account information and the existing My Account and Sign out behavior. Support dismissal, appropriate focus handling and focus restoration; choosing My Account closes the sheet. Prevent duplicate Sign out submissions while the existing action is pending.
- Hide the phone bar while the on-screen keyboard is open and restore it after closure. Apply the behavior across Back Office forms, including manual Pass Code input. Keep the focused field and relevant actions reachable, and avoid a stranded overlay or stale bottom gap after keyboard dismissal. Ordinary scrolling, address-bar movement, a hardware keyboard or focus alone must not be treated as sufficient proof of an open on-screen keyboard.
- Preserve the separate Kiosk and sign-in layouts. Do not render the bar, reserve its bottom space or recolor Kiosk controls through global styles. Public pages remain outside this shell change.
- Reuse the existing icon and accessible component systems and scoped design tokens. No new UI library, native iOS application, animation framework or persistent navigation preference is required.

## Testing Decisions

- A good test verifies what Staff can observe or do: the authoritative Check-In outcome, retained pass/day, permitted destinations, current section, readable full-panel colors, usable controls and unobstructed content. Avoid assertions on private helpers, React internals, exact class strings or a copied status-to-class mapping.
- Retain the existing agreed automated seams. No new permanent automated seam or browser framework is introduced by this specification. Presentation and platform integration are verified through the actual Back Office in a browser, supplemented by real-device acceptance.
- **Existing pure Staff Check-In flow:** preserve or extend observable lifecycle scenarios only if the implementation changes that behavior. Cover preview versus recording, Cancel, one active item, reviewed-day locking, lost-response retry, stale responses, session expiry, held QR and last-result clearing. Styling alone does not justify duplicate reducer tests.
- **Existing pure Account access policy:** preserve the Admin/Staff/Kiosk and must-change-password rules. Test changes here only if observable access decisions change; the navigation must consume the existing rules rather than create a second permission policy.
- **Existing Registration and Accounts integration suites:** run against the established fresh real PostgreSQL test databases as regression gates. Preserve confirmation uniqueness, concurrency/retry, wrong-day admission, existing timestamps, disabled-session rejection and password-change recovery. Do not add database mocks or SQL-shape tests for a visual feature.
- **Prior art:** the existing pure Staff Check-In lifecycle tests, Account-kind access tests, real-database inspection/Check-In tests and the previous redesign's authenticated production-build browser verification. Fake only permitted boundaries such as email delivery, bot checking and clock; keep live application data out of checks.
- **Status and button browser acceptance:** exercise each row of the panel-state table through the real desk and inspect the visible/computed background across the entire panel, including padding. Check the agreed button palette, focus, disabled state and contrast on every relevant background. Verify that the old small colored card is not the only colored area. Do not write a test that merely searches markup for class names.
- Use synthetic Registrations and real isolated authentication to check normal success, repeat, wrong-day preview/success/repeat, invalid pass, no Event Day, inspection failure, uncertain confirmation and session expiry. Include a discarded confirmation response after a real write and a safe retry. Verify the labeled last result, immediate neutral state on the next inspection and no duplicate Check-In. Keep browser integration checks disposable rather than introducing a new permanent test seam.
- **Navigation browser acceptance:** cover Admin, Staff, unknown/loading session and must-change-password states. Check every destination, nested-page highlighting, personal Account versus Accounts management, the Account sheet, keyboard focus, dismissal, My Account and Sign out. Verify the phone drawer and bottom bar are never both exposed, and that restricted pages remain restricted by server checks.
- **Real iPhone acceptance:** test Safari in portrait and landscape, small and larger phone dimensions, active-page indication, all five Admin icons, the two Staff icons, the Home-indicator safe area, scrolling, browser-toolbar expansion/collapse, orientation changes, glass readability, touch targets and VoiceOver names. Open and dismiss the real keyboard on Pass Code and other Back Office forms; the bar must hide and restore without covering input, Confirm or lower-page controls. Simulated viewport changes alone do not establish keyboard behavior.
- **iPad/desktop regression:** retain sidebar navigation and its toggling, Account access and Staff desk layout. Check camera startup, switching, stopping and manual fallback; the shared scanner must not impose Staff colors or a confirmation stage on the separate Kiosk. Check the Kiosk's immediate/current-day rules with an isolated clock when outside Event Days.
- Record device/browser, date, tester and outcome for hardware checks, including any unavailable checks. Keep visual/browser/device acceptance separate from a passing automated suite. Run the repository's required typecheck, lint, full tests and production build before an implementation commit and verify CI for the actual release SHA before rollout.

## Out of Scope

- Changing Registration, Event Pass UUIDs or Pass Codes, admission rules, Check-In persistence, duplicate prevention, event dates or server clock behavior.
- Changing Account kinds, permissions, authentication, session rules or the requirement to choose an owner-set password.
- Adding name search, broader Registration access or email privileges for Staff Accounts.
- Redesigning the separate Kiosk, adding Staff confirmation or Back Office navigation to it, or changing its current-day enforcement.
- Restoring automatic Kiosk mode in the staffed desk, adding navigation to sign-in/public pages or changing public-page styling.
- Replacing the desktop/iPad sidebar, changing section URLs, adding destinations, introducing visible bottom-bar text labels or persisting new menu preferences.
- Global button recoloring, a new overall theme, dark mode, a new component library, a native mobile app or a broad shell rewrite unrelated to the agreed phone navigation.
- New schema migrations, API endpoints, analytics, offline Check-In, automatic confirmation replay, undo or deletion of recorded Check-Ins.
- Creating implementation tickets, implementing the feature, committing, pushing or deploying as part of this specification request.
- Treating accepted visual decisions as a scheduling exception to the existing Back Office freeze or as permission to mutate production data for testing.

## Further Notes

- Source conversation and accepted Q1–Q8 are recorded in the [Check-In design context](../check-in-ui-redesign/context.md#follow-up-status-colors-buttons-and-mobile-navigation--28-october-2026). The organiser explicitly chose icons only for Q5 and accepted the remaining recommendations.
- This feature extends the [Staff Check-In redesign](../check-in-ui-redesign/spec.md) and the [Back Office shell](../back-office-redesign/spec.md). Its full-panel color coverage, yellow recovery states, local action palette and phone navigation supersede the corresponding presentation details of those earlier specifications; the underlying Check-In and Account contracts remain unchanged.
- No new glossary term or ADR is needed for these reversible presentation decisions. The existing Event Pass, Check-In, Staff, Admin Account, Staff Account and Kiosk vocabulary is sufficient.
- The existing sidebar mobile threshold is 768px, while the public layout's tab breakpoint is 735px. Neither number alone specifies phone identity across orientation; preserving phone bottom navigation and larger-screen sidebar behavior is the acceptance requirement.
- The previous production rollout used candidate `f6b4a23`; its successful startup and migration history are baseline evidence only. They do not verify these new colors, phone navigation or real-device behavior.
- Follow the current deployment guide and production-impact checklist when preparing a later rollout. Preserve production secrets and the database volume, back up before deployment and reload Staff desks/Kiosks afterwards. Existing ADR 0004 scheduling constraints, including the 29 October–1 November 2026 freeze, have not been lifted by this spec.
