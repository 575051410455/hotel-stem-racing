# 21: Unknown Event Pass returns HTTP 404

**What to build:** Opening `/p/{token}` for a token that doesn't exist shows the Thai not-found page, as now, but with HTTP status 404 instead of 200. `notFound()` currently runs after the response has started streaming, so the status is already 200 (found by ticket 02). A Proxy check or another approach that sets the status before streaming is needed.

**Blocked by:** None (can start immediately)

**Status:** needs-triage

- [ ] An unknown or malformed token returns 404 with the existing Thai not-found page
- [ ] A real token still renders the Event Pass, with no extra database round-trip on the hot path if avoidable
- [ ] The check stays at the Registration-module seam (`getEventPass`) and doesn't duplicate its rules
