# 04: Answers survive a language switch

**What to build:** Following the toggle on the registration form keeps every answer already given, and shows any visible errors in the new language.
- Following the toggle first saves the current answers and which fields show errors to `sessionStorage`, for this tab only.
- The form in the other language restores them once, then clears them. Errors are worked out again in the new language rather than copied as text.
- Nothing is saved anywhere else, and a plain visit to either page starts empty.

See the spec ("The toggle", "Keeping answers").

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Typed text, the chosen Attendee Role, ticked Event Days and Referral Sources, and the "other" texts all survive `/` → `/en` and back.
- [ ] A field showing an error before the switch shows it after, in the new language.
- [ ] Reloading after the restore, or opening the page in a new tab, starts with an empty form.
- [ ] Storage being unavailable (private mode, blocked) never breaks the toggle or the form.
- [ ] typecheck, lint, test and build pass. The hand-off records a check against `next start`: switching mid-form both ways, with and without errors showing.
