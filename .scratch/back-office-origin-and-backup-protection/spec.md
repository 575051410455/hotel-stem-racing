# Spec: Back Office request origin and private database backups

Status: ready-for-agent

Vocabulary follows `GLOSSARY.md`. This extends the existing Back Office API and operator deployment guidance, respecting the existing Better Auth and Cloudflare Tunnel decisions. The user confirmed that production already has real Turnstile keys, rather than the public test keys in the example environment.

## Problem Statement

An Admin Account holder can send an Event Pass again through the Back Office. The shared protection for mutating Back Office API requests currently accepts a request when its Fetch Metadata header is missing. A browser that omits that header can therefore send a request from an attacker-controlled sibling origin with the Admin Account's same-site session cookie. The resend operation accepts a simple POST, so such a request can send an unsolicited Event Pass email and change its delivery counters. This is conditional on the browser, a valid Admin session, an attacker-controlled sibling origin and configured email delivery; it is not evidence of an incident in production.

The operator's manual and nightly database backup commands also inherit the host's default file permissions. On a host with a permissive umask and a traversable home directory, a separate local account could read database dumps. Those dumps contain Attendee personal data and Account authentication data. The repository does not establish the live host's permissions or whether any dump has been exposed.

## Solution

Allow a mutating Back Office API request only when its browser origin signals establish that it came from the application's trusted origin. Continue using Fetch Metadata, add exact Origin verification when Fetch Metadata is absent, and refuse requests that provide neither trustworthy signal. Preserve normal Back Office actions, existing Admin authorization and private error responses.

Make every documented backup workflow create and retain private files: a backup directory accessible only to its owner and dump files readable and writable only by that owner. Document how to restrict existing dumps and off-server copies. Apply the same rules to manual backups, nightly backups and the deployment command summary.

## User Stories

1. As an Admin Account holder, I want to resend an Event Pass from the Back Office, so that I can help an Attendee without a security change breaking the action.
2. As an Admin Account holder, I want a sibling website to be unable to resend Event Passes through my session, so that my Account acts only on requests from the Back Office.
3. As an Admin Account holder using a browser without Fetch Metadata, I want a valid same-origin request to use Origin verification, so that supported requests remain usable.
4. As an Admin Account holder, I want a request with no verifiable origin to be refused, so that missing headers do not grant trust.
5. As an Admin Account holder, I want a conflicting Origin header to be refused even when Fetch Metadata claims same-origin, so that contradictory signals do not permit a mutation.
6. As an organiser, I want cross-site and same-site sibling requests refused before any Registration changes or emails, so that blocked requests have no side effects.
7. As an organiser, I want a different scheme or port to count as a different origin, so that only the configured Back Office origin is trusted.
8. As an organiser, I want malformed, opaque or multiple Origin values refused, so that ambiguous input cannot bypass verification.
9. As an organiser, I want the trusted origin to come from application configuration, so that request headers cannot choose the value against which they are checked.
10. As an organiser, I want missing or invalid trusted-origin configuration to prevent mutations, so that a deployment error does not silently disable protection.
11. As an Admin Account holder, I want Registration deletion protected by the same origin rule, so that every existing mutating Back Office API follows one policy.
12. As an Admin Account holder, I want bulk Event Pass email protected by the same rule, so that sending many emails has the same request-origin boundary as a single resend.
13. As an organiser, I want an allowed-origin request to require Admin authorization as well, so that origin verification does not grant Account authority.
14. As an organiser, I want rejected requests to return the existing private forbidden response, so that clients receive a predictable result without caching personal data.
15. As a Staff Account or Kiosk Account holder, I want my existing permission boundaries preserved, so that origin handling does not widen access to Registrations or email.
16. As an operator, I want a newly created backup directory to be private, so that another local account cannot browse database dumps.
17. As an operator, I want an existing backup directory to become private before a new backup is written, so that earlier permissive permissions do not survive the new instructions.
18. As an operator, I want each new dump to be private even when my normal umask is permissive, so that backup confidentiality does not depend on shell defaults.
19. As an operator, I want instructions for restricting existing dump files, so that earlier backups receive the same protection as new ones.
20. As an operator, I want a repeated backup command to keep its output private, so that an existing filename cannot retain an unsafe file mode.
21. As an operator, I want nightly backups to enforce the same permissions as manual backups, so that unattended execution does not weaken protection.
22. As an operator, I want the existing backup naming and two-week nightly retention retained, so that normal backup and recovery procedures continue to work.
23. As an operator, I want the deployment command summary and full guide to agree, so that either source gives me the protected procedure.
24. As an operator, I want off-server copies kept in a private destination, so that moving a dump does not recreate the local disclosure risk.
25. As an operator, I want to check directory and file modes without displaying dump contents, so that I can verify protection without exposing personal data.
26. As a maintainer, I want origin decisions tested through one pure policy interface, so that the important security outcomes are covered without route-by-route mocks.
27. As a maintainer, I want backup command permissions checked with synthetic data in a temporary directory, so that verification does not require a live database or real Attendee data.
28. As an organiser, I want the confirmed real production Turnstile configuration recorded separately from these changes, so that this work addresses the two requested findings without implying that production uses test keys.

## Implementation Decisions

- Cover the existing Event Pass resend POST, Registration deletion DELETE and bulk Event Pass email POST through their shared Back Office request-origin guard. Keep a single policy for those mutation interfaces.
- Prefer the existing shared guard as the integration point. Expose the allow-or-refuse decision as one pure request-origin policy that receives the relevant header values and the trusted configured origin. Keep environment reads and HTTP response construction outside the pure policy.
- Derive the trusted origin from the existing `BETTER_AUTH_URL` configuration. Compare scheme, hostname and effective port using standard URL origin semantics; normalize the configured URL to its origin. Do not derive the trusted value from request `Host`, forwarded headers or request URL.
- When `Sec-Fetch-Site` is present, accept only `same-origin` as a positive Fetch Metadata signal. Refuse `same-site`, `cross-site`, `none` and unrecognized values on these mutation endpoints.
- When `Origin` is present, require one valid serialized HTTP or HTTPS origin matching the trusted origin. Refuse a conflicting, malformed, opaque `null` or multiple origin value, including when Fetch Metadata says `same-origin`. A hostname suffix or string prefix is insufficient.
- When Fetch Metadata is absent, require a matching Origin. When both headers are absent, refuse the request. A request with `same-origin` Fetch Metadata and no Origin remains allowed.
- Accept local HTTP development origins through the same configured-origin rule. Keep the intended production HTTPS and trusted Cloudflare Tunnel ingress arrangement.
- Missing or invalid trusted-origin configuration must fail closed before sensitive work and surface as a configuration error. It must never select an allow-all fallback.
- Preserve the existing forbidden API contract: HTTP 403, the existing forbidden error body and private no-store caching. Keep origin checks before sensitive work and retain all independent Admin session and Account-kind checks.
- Keep the existing JSON-only requirement on bulk email and the existing request methods on all three routes. No new CSRF token flow or UI interaction is needed for this scope.
- In the operator guidance, set a restrictive backup umask equivalent to `077` before creating or opening a dump. Scope it to the backup command group or script so it does not unexpectedly change unrelated commands in an interactive shell.
- Ensure the backup directory has mode `0700`, including when it already exists. Ensure newly created dump files have mode `0600`. Protect the existing-output-file case as well, because a restrictive umask alone does not change a file's existing mode.
- Provide an explicit one-time repair procedure for existing regular dump files in the designated backup directory. Limit it to the intended backup files; do not recursively change unrelated home-directory permissions or follow symbolic links to other locations.
- Apply the same directory, umask and file-mode requirements to both manual and nightly backup instructions and to the deployment command summary. Preserve cron-specific percent escaping, path quoting, database selection, naming, retention and restore compatibility.
- Explain that off-server backup destinations require private permissions too. Permission repair does not prove that an earlier disclosure never happened.
- Use the existing operator workflow and ordinary filesystem permissions. No backup service, runtime application feature, schema migration, new environment variable or additional dependency is required.
- The user confirms real Turnstile keys are configured in production. Changes to bot verification and the example development keys are outside this implementation.

## Testing Decisions

- A good test checks an externally observable decision or side effect: whether a request is allowed or refused, and whether a backup directory or file is accessible only to its owner. Do not test internal helper structure, call order or copied markup.
- The single automated seam is the pure **request-origin policy**, explicitly added to the pure modules covered by this specification. Use the existing Node test runner through tsx and the existing pure Account access-policy tests as prior art. The user requested implementation of this specification and its proposed ticket breakdown; no API integration-test expansion was requested.
- Cover a matching same-origin request; a matching Origin without Fetch Metadata; same-origin Fetch Metadata without Origin; missing both headers; sibling and cross-site values; conflicting headers; opaque, malformed and multiple Origin values; different schemes and nondefault ports; deceptive hostname prefixes or suffixes; and invalid trusted-origin configuration.
- Check observable behavior through the policy's public interface with real header strings and configured origins. Do not mock Next.js, sessions, databases or route imports for these tests.
- Manually check the three existing mutating API integrations in a local environment: ordinary authorized actions still work, rejected-origin requests return the forbidden contract before side effects, and existing signed-out and Account-kind restrictions remain in force. Read-only endpoints and public Registration should retain their current behavior.
- Validate the documented backup command structure in a disposable directory with harmless synthetic content instead of a database dump. Start with a permissive umask, verify `0700` directory and `0600` file modes, then repeat with an existing permissive directory and file to verify repair. Check that the repair procedure leaves unrelated files untouched.
- Inspect manual and cron examples together for consistent permission rules and correct cron escaping. Check the copied-backup destination instructions without using real production dumps.
- Follow existing Registration-module tests for any changed Registration behavior; no new Registration rule is expected here. If such tests become necessary, use the existing fresh real database and fake only the project's allowed boundary collaborators.
- Before a code commit, run the repository's required typecheck, lint, full test suite and production build. Documentation-only specification authoring does not require running application tests.

## Out of Scope

- Changing Turnstile configuration or verifier behavior, replacing production credentials, or reading secret values.
- Extending the security scan to the remaining repository files or asserting that the earlier whole-project review was complete.
- Changing Better Auth, Next.js Server Action protections, Account permissions, session lifetime, public Registration or Check-In rules.
- Adding an Origin fallback to unrelated public, authentication, webhook or read-only interfaces.
- Adding a CSRF token UI, a browser end-to-end test framework or a general API testing framework.
- Changing backup encryption, storage services, database retention, restore semantics or introducing automated host provisioning.
- Connecting to production, changing live cron entries or file permissions, rotating credentials, or treating a conditional finding as proof of a breach.
- Rewriting the completed security scan's sealed report or changing its historical findings based solely on this specification.

## Further Notes

- This specification synthesizes the conversation about the two conditional Low findings from Codex Security scan `f5bb6637-3b2e-488b-9101-503e36d82887`, which reviewed revision `8310e9a663b8d3445641c4c0f50ab6ee4ac92357` with partial repository coverage.
- The user subsequently confirmed that production has real Turnstile keys rather than the public example test keys. This is supplied deployment context; no secret value was requested or independently inspected.
- Existing origin integration: `src/app/api/back-office/route-helpers.ts`, used by Registration resend, deletion and bulk email mutation routes. Existing operator instructions: `docs/deploy-guide/index.html` and `docs/deploy.md`.
- Existing domain and deployment decisions: `GLOSSARY.md`, ADR 0001 for Better Auth and self-hosted PostgreSQL, ADR 0004 for Admin-only management, and ADR 0005 for Cloudflare Tunnel ingress. This specification does not contradict those decisions.
- Reference guidance already consulted in the conversation: [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) and [GNU file permission guidance](https://www.gnu.org/software/coreutils/manual/html_node/Setting-Permissions.html).
