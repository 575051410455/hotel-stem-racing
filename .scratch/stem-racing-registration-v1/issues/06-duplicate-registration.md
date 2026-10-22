# 06: Duplicate Registration

**What to build:** When someone submits the form again for the same person (same given name, family name and phone), no second Registration is created. They are told "ท่านลงทะเบียนแล้ว", and their existing Event Pass is re-sent to the registered email, which is shown masked. The pass itself is never shown on screen. Family members sharing a parent's email or phone can still register separately.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] The Duplicate Registration key (trimmed, case-folded given and family name + E.164 phone) is detected and backed by the database constraint, including when two submissions race
- [ ] A duplicate response shows the masked email (e.g. j***@gmail.com) and never the token, the Pass Code or a link to the pass
- [ ] Re-send goes through the email-sender port at most once per 10 minutes per Registration. When email is not configured, the organisers' contact channels are shown instead.
- [ ] The same email or phone with a different name is accepted as a new Registration
- [ ] Integration tests cover each of the above with a fake email sender and a fake clock
