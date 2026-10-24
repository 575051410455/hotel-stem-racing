# 03: The Event Pass page, card and saved image in English

**What to build:** `/en/p/:token` shows the thank-you text, instructions and Event Pass card in English, and "Save Event Pass" saves an English card image.
- The card and its PNG take the page's language: title, date line, venue, labels, Event Day labels, QR name, image alt and the file-save messages. The file name is unchanged.
- The English tab title is "Event Pass · STEM Racing Thailand 2026".
- QR content and Event Pass links don't change.

See the spec ("The Event Pass card and its PNG") and `copy-public.md` ("Event Pass page", "Event Pass card and saved image").

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] `/en/p/:token` matches `copy-public.md`; `/p/:token` is unchanged.
- [ ] The saved PNG on `/en/p/:token` is in English; on `/p/:token` it is Thai as now. Both encode the same link.
- [ ] typecheck, lint, test and build pass. The hand-off records a check against `next start`: the English page and card at 375 and 1280 px, both PNGs saved and looked at, the toggle keeping the token, and an unknown `/en/p/x` giving the English 404.
