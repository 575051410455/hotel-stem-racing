# 05: Event Pass email

**What to build:** An Event Pass email that renders correctly in Gmail and Outlook, plus an SMTP sender that implements the Registration module's email-sender port and never throws. The operator can send a test Event Pass email to any address with a command, which verifies SMTP setup before launch.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] A pure builder returns subject, HTML and plain text following the spec's template:
  - 600px white card on #f4f4f7
  - banner header (inline CID, at most 300KB)
  - Thai-then-English greeting
  - details table with dates and times as a range in Asia/Bangkok
  - QR PNG (width 220, margin 2, error correction M) as inline CID, with the Pass Code in large monospace
  - CTA button plus raw link
  - conditions and signature
- [ ] The HTML uses inline styles and tables only, a VML fallback for Outlook backgrounds and contrast-chosen button text, and every Attendee-entered value is HTML-escaped
- [ ] The SMTP sender uses nodemailer pooling (max 10 connections, 100 messages each) and returns success or an error without throwing. When SMTP is not configured, the email-sender port stays a no-op.
- [ ] A server command sends a sample Event Pass email to a given address
- [ ] Unit tests cover escaping, presence of the plain-text part, Pass Code and raw link, and Bangkok-time formatting
