# Spec: PDPA acknowledgment on Attendee Registration

Status: ready-for-agent

Vocabulary follows `GLOSSARY.md`. This extends the existing public Registration form and Back Office without giving Attendees Accounts (ADR 0002). The accepted decisions are from the 25 October 2026 conversation with the organiser.

## Problem Statement

An Attendee can currently submit a Registration without seeing or acknowledging the organiser's detailed personal data notice. The brief privacy sentence below the submit button does not link to the organiser's policy. An Admin Account therefore cannot tell from a Registration whether the Attendee acknowledged the notice, when they did so, or which event notice was shown. Existing Registrations predate this requirement and must not be presented as acknowledged.

## Solution

Show the supplied PDPA notice immediately after the optional questions or suggestions field on the Thai and English public forms. Link its policy reference to Grand Richmond Hotel's [official Customer Privacy Policy](https://grandrichmondhotel.com/privacypolicy). A required, initially unchecked acknowledgment checkbox follows the notice. An Attendee who has not checked it sees a localized field error and cannot submit a new Registration. The server checks the submitted value again before saving.

For an accepted Registration, store the server's acknowledgment time, the linked policy URL, and a stable version identifier for the **event notice displayed in this form**. Show this record in the Admin-only Registration detail. A Registration made before this feature has no acknowledgment record and reads “Not recorded” there. The external hotel policy has no visible version identifier; the event notice version must not be presented as its version or as a snapshot of its contents. Remove the older short privacy sentence below the submit button. Keep the separate “one person per form” reminder.

This checkbox records acknowledgment of a notice. It is not consent to marketing or a claim that acknowledgment is the legal basis for every processing purpose.

## User Stories

1. As an Attendee using the Thai form, I want to read the PDPA notice in Thai after the questions or suggestions field, so that I understand how my Registration data will be used before submitting.
2. As an Attendee using the English form, I want the corresponding notice in English at the same place, so that either public language explains the same purposes.
3. As an Attendee, I want the organiser identified as Grand Richmond Hotel, so that I know who is responsible for the notice.
4. As an Attendee, I want the notice to identify the categories of data provided through the form, so that I know what it covers.
5. As an Attendee, I want the purposes of Registration, attendance confirmation, Event coordination, Event communication and Event management stated, so that the intended uses are clear.
6. As an Attendee, I want to read the organiser's full policy through a working link, so that I can find retention information and data subject rights.
7. As an Attendee, I want the acknowledgment checkbox unchecked when I first open the form, so that the choice records my own action.
8. As an Attendee, I want a clear required mark and a localized error if I try to submit without acknowledging, so that I know what to correct.
9. As a keyboard or screen-reader user, I want the checkbox labeled, focusable, and associated with its error, so that I can complete it without a mouse.
10. As an Attendee switching between Thai and English while filling the form, I want my checkbox state kept with my other answers, so that I do not lose progress.
11. As an Attendee, I want the old short privacy sentence removed once the full notice is shown, so that the form does not repeat itself.
12. As an organiser, I want the server to reject a missing or invalid acknowledgment even if someone bypasses browser validation, so that only acknowledged new Registrations are accepted.
13. As an organiser, I want the acknowledgment time recorded from the server clock with each accepted Registration, so that the evidence does not depend on the Attendee's device clock.
14. As an organiser, I want the policy URL and event notice version recorded with the time, so that I can identify what the form linked to and which event notice it displayed.
15. As an organiser, I want future revisions of the event notice to use a new version identifier, so that records made under different wording stay distinguishable.
16. As an organiser, I want a Duplicate Registration submission to leave the original Registration's acknowledgment evidence unchanged, so that its history stays accurate.
17. As an Admin Account holder, I want to see acknowledgment time, event notice version and policy URL on Registration detail, so that I can inspect the evidence when needed.
18. As an Admin Account holder, I want old Registrations to say “Not recorded” rather than imply acceptance, so that their history is represented honestly.
19. As an Attendee viewing an Event Pass, I want the acknowledgment evidence kept out of the pass, so that it exposes no extra personal history.

## Implementation Decisions

- Use the supplied English wording and its agreed Thai translation. The heading is “Acknowledgment of the Personal Data Protection Policy (PDPA)” / “การรับทราบนโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA)”. The Thai body and checkbox copy are recorded under Further Notes.
- Place the notice and checkbox directly after questions or suggestions and before bot protection and the submit button. Keep the external policy link visible within the notice in both languages.
- Use `https://grandrichmondhotel.com/privacypolicy`, found through the Privacy link on Grand Richmond Hotel's official site. The page offers Thai and English language controls at the same URL.
- Treat acknowledgment as a required Registration field. It participates in the existing form order, immediate validation, submit focus behavior and server-side field validation. Only the checked value is valid; extra or altered submitted values do not bypass this check.
- Keep the event notice version as an explicit, stable application value. Change it when the notice wording changes. Store the version and policy URL used at registration, with a timestamp from the injected server clock. Do not trust version, URL or timestamp submitted by the browser.
- Add nullable acknowledgment evidence to the Registration data shape, so existing rows remain without evidence. Do not backfill them. No separate Attendee Account or acknowledgment service is needed.
- Show evidence only in Admin-only Registration detail. Keep it out of Event Passes, public responses, list rows, and CSV export.
- Save evidence atomically with a newly accepted Registration. A failed, invalid, blocked, closed or Duplicate Registration does not create or alter an acknowledgment record.
- Remove the existing short privacy note below the submit button; retain the one-person-per-form reminder.
- Update public copy documentation and the Registration specification to reflect the new notice and its versioning rule. The hotel's external policy remains under the hotel's control.

## Testing Decisions

- Test externally observable behavior at the existing seams, using the project's Node test runner. Avoid tests that only repeat markup or implementation details.
- The pure Registration field module tests unchecked, checked and altered submitted values, Thai and English errors, form order, and FormData parsing. Existing validation tests provide the pattern.
- The Registration module tests with a fresh real database verify that an unacknowledged submission saves nothing; an accepted Registration stores the server time, policy URL and event notice version; a Duplicate Registration leaves the first record unchanged; and a legacy row with null evidence is returned accurately on detail. Existing Registration and detail integration tests provide the pattern.
- Use the injected clock for deterministic evidence timestamps. Fake only the existing boundary collaborators as allowed by project conventions.
- Run the required typecheck, lint, complete test suite and production build before committing.

## Out of Scope

- Marketing consent or any separate optional consent purpose.
- Defining a data retention period or changing the hotel's external privacy policy.
- Archiving a copy of the hotel's mutable external policy or assigning a version to it.
- Backfilling evidence for existing Registrations.
- Displaying acknowledgment evidence in CSV exports, Event Passes, public APIs or emails.

## Further Notes

Agreed Thai notice:

> **การรับทราบนโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA)**
>
> โรงแรมแกรนด์ ริชมอนด์ ในฐานะผู้จัดงาน STEM Racing Thailand National Finals 2026 มุ่งมั่นคุ้มครองข้อมูลส่วนบุคคลของผู้ลงทะเบียนตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
>
> ข้อมูลที่ท่านให้ผ่านแบบฟอร์มนี้ รวมถึงชื่อและนามสกุล หมายเลขโทรศัพท์ อีเมล และข้อมูลอื่นที่เกี่ยวข้อง จะถูกเก็บรวบรวมและใช้เพื่อดำเนินการลงทะเบียน ยืนยันการเข้าร่วมงาน ประสานงาน แจ้งข้อมูลเกี่ยวกับงาน และบริหารจัดการงาน โดยจะประมวลผลตามวัตถุประสงค์ดังกล่าวและใช้มาตรการคุ้มครองข้อมูลที่เหมาะสม
>
> ท่านสามารถอ่านรายละเอียดเพิ่มเติมเกี่ยวกับการใช้ข้อมูล ระยะเวลาการเก็บรักษา และสิทธิของเจ้าของข้อมูลส่วนบุคคลได้ใน [นโยบายความเป็นส่วนตัวของผู้จัดงาน](https://grandrichmondhotel.com/privacypolicy)
>
> ☐ ข้าพเจ้ารับทราบว่าได้อ่านและเข้าใจนโยบายคุ้มครองข้อมูลส่วนบุคคล รวมถึงวัตถุประสงค์ในการเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลตามที่ระบุข้างต้น

Agreed English notice:

> **Acknowledgment of the Personal Data Protection Policy (PDPA)**
>
> Grand Richmond Hotel, as the organizer of STEM Racing Thailand National Finals 2026, is committed to protecting the personal data of all registrants in accordance with the Personal Data Protection Act B.E. 2562 (2019) (PDPA).
>
> The information provided through this registration form, including your full name, telephone number, email address, and other relevant details, will be collected and used for registration purposes, attendance confirmation, event coordination, communication of event-related information, and event management. All personal data will be processed in accordance with the stated purposes and appropriate data protection measures.
>
> Registrants may find further information regarding the use of personal data, data retention periods, and their rights as data subjects in the [Organizer’s Privacy Policy](https://grandrichmondhotel.com/privacypolicy).
>
> ☐ I acknowledge that I have read and understood the Personal Data Protection Policy (PDPA), including the purposes of the collection, use, and disclosure of my personal data as outlined above.

The policy URL was verified through the [Grand Richmond Hotel website](https://grandrichmondhotel.com/privacypolicy) on 25 October 2026. Its page does not expose a reliable published version for this feature to record.
