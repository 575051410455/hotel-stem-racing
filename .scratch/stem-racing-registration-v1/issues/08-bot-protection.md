# 08: Bot protection

**What to build:** The public form is protected by Cloudflare Turnstile and a per-IP submission rate limit. Real Attendees barely notice either, and bots and floods are turned away with a clear Thai message.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] The Turnstile widget renders on the form using the public site key. With the test keys from `.env.example` it works locally.
- [ ] The server verifies the Turnstile token through the bot-check verifier port before accepting a Registration. A failure returns a Thai message and saves nothing.
- [ ] An in-memory per-IP limit applies to submissions, keyed on the client IP restored by nginx from Cloudflare's header. Exceeding it returns a Thai "try again later" message.
- [ ] Tests cover a verifier failure rejecting the submission and the rate limit tripping after the threshold
