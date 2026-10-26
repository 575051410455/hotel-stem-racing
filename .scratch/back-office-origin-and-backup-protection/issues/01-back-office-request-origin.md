# 01: Verify the origin of Back Office mutations

**What to build:** An Admin Account holder can resend Event Passes, delete Registrations and send bulk email from the Back Office, while requests without trustworthy same-origin evidence are refused before any side effect.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] One pure request-origin policy drives the shared guard used by all three existing mutating API interfaces; the trusted origin comes from configured `BETTER_AUTH_URL`, never request-derived host values.
- [x] Same-origin Fetch Metadata is accepted; an absent Fetch Metadata header requires an exact matching Origin. Missing both headers, sibling or cross-site values, conflicting headers and malformed or opaque Origin values are refused.
- [x] Origin comparison handles scheme and effective port correctly, supports configured local HTTP development, and fails closed with a clear configuration error for invalid trusted-origin settings.
- [x] Rejected requests keep the existing private no-store HTTP 403 forbidden contract. Existing Admin authorization, methods and JSON-only bulk-email input remain enforced.
- [x] Tests at the pure policy seam cover allowed flows, the original headerless trigger, alternate origin representations and configuration failures; local checks cover the three API integrations without production access.
- [x] Typecheck, lint, the full test suite and production build pass before commit.

## Answer

Implemented the shared guard with one pure request-origin policy and seven behavior tests, developed through failing-then-passing cycles. The configured public URL is normalized independently of request data; source Origin syntax is checked before URL comparison.

Validation: focused policy tests, typecheck, lint, all 359 tests and the production build passed. A local production-server smoke check used a disposable real database, fixture Admin/Staff/Kiosk Accounts and disabled SMTP. All three mutations returned private forbidden responses for missing or conflicting evidence, retained Admin-only authorization, and accepted legitimate Origin fallback and same-origin Fetch Metadata. Authorized deletion removed only the fixture; read-only listing still worked. The local server was stopped and its database dropped.

Standards review, spec review and an independent bypass/regression review reported no findings. Live deployment configuration was not modified.
