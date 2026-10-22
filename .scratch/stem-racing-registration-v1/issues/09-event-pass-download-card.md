# 09: Event Pass download card

**What to build:** On their Event Pass page, an Attendee can download the pass as a print-ready PNG card named after the Pass Code.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] A download button produces a 1024×1204 PNG with an 80px quiet zone around the QR and the Pass Code and Event Days printed underneath
- [ ] The file name is the Pass Code and never contains the token
- [ ] Converting the SVG for the card works with Thai text: URI-component encoding, not base64
- [ ] Manually checked on iOS Safari and Android Chrome
