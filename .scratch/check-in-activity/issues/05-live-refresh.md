# 05: Refresh Check-In Activity during the Event

**What to build:** Staff using an Admin Account see current Check-In rows and overview counts without leaving their selected view, with clear recovery when updates fail.

**Blocked by:** 02: See the selected Event Day's Check-In overview.

**Status:** ready-for-agent

- [x] Refresh the active history and selected-day summary every 15 seconds while visible, through TanStack Query; pause hidden-tab polling and stop on unmount.
- [x] Refresh button updates both rows and summary; retain Event Day, query, filters, page and page size.
- [x] A new Check-In appears and changes summary counts after refresh; a repeat does not inflate either result.
- [x] Show updating/failure states without presenting stale data as current. Offer retry; expired/revoked access hides previously loaded personal data, stops polling and offers sign-in.
- [ ] Browser-check refresh, visibility, manual retry and URL state preservation with synthetic data in an isolated environment. Run all four required checks, code review and dev-check-prod, then verify both CI jobs for the exact pushed SHA.
- [ ] Record existing Event Pass/QR and Check-In regression evidence, changed-file classification and any unavailable production/device evidence. Do not deploy automatically.
