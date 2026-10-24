# 04: Answers survive a language switch

**What to build:** Following the toggle on the registration form keeps every answer already given, and shows any visible errors in the new language.
- Following the toggle first saves the current answers and which fields show errors to `sessionStorage`, for this tab only.
- The form in the other language restores them once, then clears them. Errors are worked out again in the new language rather than copied as text.
- Nothing is saved anywhere else, and a plain visit to either page starts empty.

See the spec ("The toggle", "Keeping answers").

**Blocked by:** 02

**Status:** resolved

- [x] Typed text, the chosen Attendee Role, ticked Event Days and Referral Sources, and the "other" texts all survive `/` → `/en` and back.
- [x] A field showing an error before the switch shows it after, in the new language.
- [x] Reloading after the restore, or opening the page in a new tab, starts with an empty form.
- [x] Storage being unavailable (private mode, blocked) never breaks the toggle or the form.
- [x] typecheck, lint, test and build pass. The hand-off records a check against `next start`: switching mid-form both ways, with and without errors showing.

## Answer

Done on branch `thai-english-04-keep-answers`.

### What's where

| What | Where |
| --- | --- |
| Keep and take the answers (`sessionStorage`, one key, read once then removed; only the form's own fields, each of the right shape) | `src/components/registration/kept-answers.ts` |
| The toggle's links carry `data-language-switch` | `src/components/site/LanguageToggle.tsx` |
| The form keeps its answers on a click on `[data-language-switch]` (one document listener, `useEffectEvent` for the latest answers), and restores kept answers before paint | `src/components/registration/RegistrationForm.tsx` |

### Decisions

- **Errors aren't copied as text.** The fields that were showing an error are kept; the form in the other language marks them again, and its own validation words them.
- **Server-only errors** (an Event Day that ended on the server's clock) aren't carried over; they come back on the next submit.
- **A restored Event Day that has ended since is dropped**, since the form no longer shows its box.
- **Nothing is kept while the Duplicate Registration or "registration closed" notice is showing**: the form isn't on screen.
- **`react-hooks/set-state-in-effect` is disabled on the restore**, with the reason inline: the server can't see this tab's storage, so it is read once after hydration (in a layout effect, so the form never flashes empty).

### Verified

- typecheck, lint, 231 tests and build pass (no new tests: UI isn't an agreed seam).
- **Headless Chrome against `next start`** (10 checks, all pass):
  - Thai form half filled with "Other" role and text, both Event Days, LINE and "Other" Referral Sources with text, team, needs and comments, and errors showing on family name and email → `/en`: every answer and choice restored, the same two fields show their errors in English, and the kept answers are gone from storage.
  - Back to `/`: everything still there, errors in Thai again.
  - Reloading `/` and a plain visit to `/en` start empty.
  - A complete Thai form switched to `/en` and submitted lands on `/en/p/:token` with the typed name.
  - `sessionStorage` throwing on access: the toggle still switches and the English form starts empty and works.
