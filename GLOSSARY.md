# STEM Racing Thailand 2026 — Attendee Registration

Online registration for people coming to STEM Racing Thailand 2026 to watch and support the competing teams.

## Language

### The Event

**Event** (งาน):
STEM Racing Thailand 2026, held 30 October – 1 November 2026 (2569) at Grand Richmond Hotel, Nonthaburi.
_Avoid_: Competition (that is what happens at the Event), show

**Event Day** (วันเข้าร่วมงาน):
One calendar day of the Event that an Attendee can choose to attend.
_Avoid_: Session, date slot

**Competing Team** (ทีมที่เข้าร่วมการแข่งขัน):
A student team racing at the Event. Members of a Competing Team are competitors, not Attendees.
_Avoid_: Team (on its own, when ambiguous), participant

### People

**Attendee** (ผู้เข้าร่วมงาน):
A person who comes to the Event to watch or support, not to compete.
_Avoid_: Participant, guest, visitor, user

**Attendee Role** (ฐานะการเข้าร่วมงาน):
The capacity in which an Attendee comes: Parent, Teacher, Student, Sponsor, or Other.
_Avoid_: Type, category, user type

**Sponsor** (สปอนเซอร์ / ผู้สนับสนุน):
An Attendee Role for someone representing a supporting company or organisation; always tied to the organisation they represent.

### Registration

**Registration** (การลงทะเบียนเข้าร่วมงาน):
One Attendee's declared intent to attend the Event on one or more Event Days, submitted by the Attendee without an Account. Exactly one person per Registration.
_Avoid_: Booking, ticket, sign-up, RSVP

**Event Pass** (บัตรเข้างาน):
What an Attendee shows at the entrance to be checked in: a scannable QR plus a Pass Code. Each Registration has exactly one.
_Avoid_: Ticket, voucher, registration reference

**Pass Code** (รหัส Event Pass):
The short code on an Event Pass that a person can read and type, used when the QR cannot be scanned.
_Avoid_: Reference number, ticket number, booking ID

**Duplicate Registration** (การลงทะเบียนซ้ำ):
A second Registration for the same person, recognised by an identical given name, family name and phone number. Shared email addresses or phone numbers alone do not make a duplicate, because family members often register with a parent's contact details.
_Avoid_: Double booking, repeat

**Referral Source** (ช่องทางที่ทราบข่าว):
A channel through which an Attendee heard about the Event; one Registration can name several.
_Avoid_: Channel, marketing source

**PDPA acknowledgment** (การรับทราบนโยบายคุ้มครองข้อมูลส่วนบุคคล):
An Attendee's required statement, when submitting a Registration, that they have read the Event's PDPA notice. It is saved with the server time, the event notice version and the linked policy URL. Registrations made before the checkbox was added have none. It is not consent to marketing.
_Avoid_: Consent, agreement, opt-in

**Event notice version** (เวอร์ชันข้อความแจ้ง):
The identifier of the PDPA notice wording shown beside the checkbox; it changes whenever that wording changes. It is not a version of the hotel's own privacy policy.
_Avoid_: Policy version

### At the door

**Check-In** (การเช็คอิน):
The record that an Attendee arrived at the Event on a particular Event Day; at most one per Registration per Event Day. An Attendee may be checked in on an Event Day they did not choose.
_Avoid_: Scan, entry, attendance

**Kiosk** (จุดเช็คอินด้วยตนเอง):
A check-in station where Attendees hold up their own Event Pass to the camera, with no Staff operating it.
_Avoid_: Self-service terminal, scanner

### Back Office

**Back Office** (ระบบหลังบ้าน):
The staff-only part of the system, entered by signing in.
_Avoid_: Admin panel, dashboard, CMS

**Staff** (เจ้าหน้าที่):
A member of the organising team who signs in to the Back Office, with a Staff Account or an Admin Account.
_Avoid_: Admin (that is an Admin Account), user, operator

**Account** (บัญชี):
A sign-in identity for the Back Office, keyed by email address: a Staff Account, an Admin Account or a Kiosk Account. Attendees never have Accounts. An Account can be disabled: it can't sign in until an Admin Account enables it again. Accounts are never deleted.
_Avoid_: User, member, profile

**Staff Account** (บัญชีเจ้าหน้าที่):
The Account of a Staff member who checks Attendees in at the entrance: it can record Check-Ins and see its own Account, and nothing else in the Back Office.

**Admin Account** (บัญชีผู้ดูแลระบบ):
The Account of a Staff member with full access to the Back Office: Registrations, Check-Ins, email and managing Accounts. There is always at least one enabled Admin Account.
_Avoid_: Superuser, owner, role

**Kiosk Account** (บัญชี Kiosk):
An Account that can only run a Kiosk and record Check-Ins; it can see no Registration data.
_Avoid_: Device account, guest account

**Account Change** (การเปลี่ยนแปลงบัญชี):
One recorded change to an Account (created, name, email or kind changed, password set or changed, disabled or enabled), with who made it and when, never a password. All of them together, newest first, are the **Account History** (ประวัติบัญชี).
_Avoid_: Audit log entry, activity, event (an Event is the competition)
