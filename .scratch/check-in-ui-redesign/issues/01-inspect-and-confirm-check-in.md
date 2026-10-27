# 01: Inspect an Event Pass and confirm the Check-In

**What to build:** Staff and Admin Account holders can scan or enter an Event Pass, review the Attendee and Event Day without recording arrival, then explicitly Confirm Check-In or Cancel. The staffed desk handles repeats, wrong-day arrivals and uncertain confirmation responses without creating duplicate Check-Ins.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Apply the parent specification and ADR 0006: every staffed-desk input inspects first, and only Confirm Check-In records arrival. Manual Enter opens a preview, Cancel before confirmation records nothing, and an old staffed Kiosk-mode link opens this same confirmation desk.
- [x] Read-only inspection accepts the established Pass Code, token and Event Pass link forms and returns only the limited Attendee details, effective Event Day and existing Check-In status needed at the entrance. Repeated inspection changes no Registration state or counters.
- [x] Staff inspection and confirmation require a current Staff or Admin Account; the recording Account is derived from its session. No public preview, name search, contact lookup or wider Registration browsing is added.
- [x] A valid new pass shows a neutral ready-to-confirm preview. An existing Check-In shows the original time and Scan next without Confirm; an invalid or removed pass cannot be confirmed. A wrong-day preview warns Staff but can still be explicitly confirmed under the existing rules.
- [x] Hold one active Attendee and the server-resolved Event Day through review, confirmation and retry. Ignore extra inputs and stale responses, lock date changes and disable repeated confirmation while a request is pending.
- [x] Confirmation rechecks current pass, Event Day and server state. A concurrent Check-In returns its original recorded outcome; a deleted Registration cannot be recorded from an old preview. The existing unique Registration/Event Day constraint remains authoritative.
- [x] A lost confirmation response retains the same pass and reviewed day with Unable to confirm result and Retry confirmation. Retrying a completed write creates no duplicate; an uncertain or pending confirmation is not presented as cancellable undo.
- [x] After successful confirmation, distinguish readiness from the last result and automatically accept the next different Attendee. Session expiry blocks confirmation and offers Sign in again; signing in requires fresh inspection rather than replaying a stale confirmation.
- [x] Tests at the real-database Registration seam prove inspection has no write, confirmation records once, reviewed day survives clock changes, and concurrent, retried, wrong-day, invalid, deleted and existing cases behave correctly. Tests at the agreed pure Staff Check-In flow seam cover the active-item lifecycle without React or route mocks.
- [x] Local checks cover authorized and unauthorized Staff-facing entry points and unchanged separate-Kiosk behavior. The separate Kiosk retains its existing immediate Check-In and Account boundaries.
- [x] Typecheck, lint, the full test suite and production build pass before an implementation commit; record the verification evidence and any remaining release checks.

## Comments

Implemented and locally verified on 27 October 2026. See [verification](../verification.md) for the real-database/pure-flow tests, real Server Action/browser integration, review results and remaining release checks shared with tickets 02–03.
