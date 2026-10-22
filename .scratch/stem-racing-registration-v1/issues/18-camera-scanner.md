# 18: Camera scanner

**What to build:** Staff scan Event Passes with the phone or tablet camera on `/admin/check-in`. The scanner reads QR codes anywhere in the frame, switches between front and back cameras safely, remembers the chosen camera per device, and shrugs off stray QR codes.

**Blocked by:** 13

**Status:** ready-for-agent

- [ ] html5-qrcode with no scan box, QR format only, 10 fps and no "try harder" mode. Results feed the same Check-In flow as ticket 13.
- [ ] Camera switching:
  - uses a non-exact front/back facing mode
  - always waits for the current stream to stop before starting the next
  - disables the switch and stop controls and shows "Starting..." while switching
  - on failure, shows an error, restores the previous camera and does not save the choice
- [ ] The camera preference is a pure module separate from React. It is stored per device; "front" means front and anything else means back. Every storage access is wrapped so private browsing works.
- [ ] A QR that isn't an Event Pass shows an orange notice for 3 seconds, silently, and scanning continues. The same text is suppressed for 10 seconds. The browser recogniser is looser than the server's.
- [ ] Unit tests cover the camera preference module. The scanner is manually checked on iPhone/iPad Safari and Android Chrome.
