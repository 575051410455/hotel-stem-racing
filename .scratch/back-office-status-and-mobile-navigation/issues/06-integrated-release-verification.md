# 06: Integrated device acceptance and production-impact review

**What to build:** The release has inspectable evidence for the combined presentation and navigation and an honest production-readiness verdict.

**Blocked by:** 01, 02, 04, 05.

**Status:** ready-for-human

- [x] Integrate the status and action palettes with phone navigation; check all panel states, authoritative results, Account restrictions, nested links and keyboard/focus interactions.
- [x] Record browser checks using synthetic data and real isolated authentication; retain real-database and pure seams and run typecheck, lint, the full suite and production build.
- [ ] Record real iPhone portrait/landscape, safe-area, keyboard and VoiceOver checks and real iPad/desktop/Kiosk regression; unavailable device checks remain explicitly outstanding.
- [ ] Apply dev-check-prod to the actual candidate: classify every changed file, compare the known production baseline, check migration/config/runtime compatibility and CI for the release SHA.
- [x] Keep production data/credentials untouched, preserve the active deployment freeze, and prepare backup, rollout, reload and post-deploy verification steps without deploying automatically.

## Comments

Integrated local checks and independent review are complete. dev-check-prod classifies every candidate file and reports BLOCKED for rollout while real-device acceptance, release-SHA CI and freeze scheduling are outstanding. No production deployment was performed. See [verification](../verification.md).
