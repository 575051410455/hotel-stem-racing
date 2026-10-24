# Copy deck: English Back Office

Part of [spec.md](spec.md). This is a draft for the organisers to review.
- The Thai column is today's text, kept so the reviewer can match each row; it is replaced by the English.
- `{…}` is filled in at run time.
- People counts read "1 person" / "{n} people", and email counts "1 email" / "{n} emails".
- Glossary terms are fixed: Registration, Attendee, Attendee Role, Event Pass, Pass Code, Check-In, Event Day, Kiosk, Staff, Staff Account, Kiosk Account, Referral Source, Duplicate Registration.

## Formats

| What | Thai today | English |
| --- | --- | --- |
| Timestamp (list, detail, CSV) | 22 ต.ค. 2569 14:05 | 22 Oct 2026, 14:05 |
| Event Day, short (list, filters) | 31 ต.ค. | Sat 31 Oct |
| Event Day, long (cards, desk, detail) | วันที่ 31 ตุลาคม 2569 | Saturday 31 October 2026 |
| Chart axis | 23 ต.ค. | 23 Oct |
| Chart tooltip | ศ. 23 ต.ค. 2569 | Fri 23 Oct 2026 |
| Chart table (screen readers) | วันศุกร์ที่ 23 ตุลาคม 2569 | Friday 23 October 2026 |
| Count | 1,234 | 1,234 |
| Attendee Role values | ผู้ปกครอง, คุณครู / อาจารย์, นักเรียน / นักศึกษา, สปอนเซอร์ / ผู้สนับสนุน, อื่น ๆ | Parent, Teacher / Lecturer, Student, Sponsor / Supporter, Other |
| Referral Source values | เว็บไซต์, โรงเรียน / สถาบันการศึกษา, บริษัท / หน่วยงาน, เพื่อน / คนรู้จัก, ทีมที่เข้าร่วมการแข่งขัน, อื่น ๆ | Website, School or university, Company or organisation, Friend or acquaintance, A Competing Team, Other |
| Organisation label | ชื่อโรงเรียน / สถาบันการศึกษา / บริษัท / หน่วยงาน · บริษัท / องค์กรที่ท่านเป็นตัวแทน (Sponsor) | School or organisation · Company or organisation represented (Sponsor) |
| Phone | 081-234-5678 | 081-234-5678 for a Thai number; +447700900123 for an international one |

## Shell (every page)

| Thai | English |
| --- | --- |
| ระบบหลังบ้าน · {event} (tab title) | Back Office · {event} |
| %s · ระบบหลังบ้าน · {event} | %s · Back Office · {event} |
| ระบบหลังบ้าน (sidebar header) | Back Office |
| แถบเมนูระบบหลังบ้าน | Back Office sidebar |
| เมนูระบบหลังบ้าน | Back Office menu |
| ผู้ลงทะเบียน (nav) | Registrations |
| เช็คอิน (nav) | Check-In |
| ส่งอีเมล (nav) | Email |
| เข้าสู่ระบบในชื่อ (screen readers) | Signed in as |
| เปลี่ยนรหัสผ่าน | Change password |
| ออกจากระบบ | Sign out |
| เมนู / เลือกหน้าที่จะไป (mobile sheet) | Menu / Choose a page |
| เปิดหรือปิดเมนู | Open or close the menu |
| ปิด (sheet close) | Close |
| ตำแหน่งของหน้านี้ (breadcrumb) | Breadcrumb |
| เพิ่มเติม (breadcrumb) | More |
| การแจ้งเตือน (Toaster) | Notifications |
| ปิดการแจ้งเตือน | Close notification |
| กำลังโหลด… | Loading… |
| หมดเวลาการเข้าสู่ระบบ | Session expired |
| เข้าสู่ระบบอีกครั้ง | Sign in again |
| ลองอีกครั้ง | Try again |
| ยกเลิก | Cancel |

## Sign-in page

| Thai | English |
| --- | --- |
| เข้าสู่ระบบ (tab title) | Sign in |
| เข้าสู่ระบบหลังบ้าน | Sign in to the Back Office |
| สำหรับเจ้าหน้าที่ {event} | For Staff of {event} |
| อีเมล / รหัสผ่าน | Email / Password |
| เข้าสู่ระบบ / กำลังเข้าสู่ระบบ… | Sign in / Signing in… |
| กรุณากรอกอีเมลและรหัสผ่าน | Please enter your email and password |
| อีเมลหรือรหัสผ่านไม่ถูกต้อง | Wrong email or password |
| กรุณากรอกอีเมลให้ถูกต้อง | Please enter a valid email |
| พยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ {n} วินาทีแล้วลองใหม่ | Too many sign-in attempts. Wait {n} seconds and try again. |
| พยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่ | Too many sign-in attempts. Wait a moment and try again. |
| เชื่อมต่อระบบไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่ | Can't reach the server. Check your internet connection and try again. |
| เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง | Sign-in failed. Please try again. |
| ลืมรหัสผ่าน? ติดต่อผู้จัดงานเพื่อตั้งรหัสผ่านใหม่ | Forgot your password? Ask the organisers to set a new one. |

## Change password

| Thai | English |
| --- | --- |
| เปลี่ยนรหัสผ่าน (title, button) | Change password |
| กำลังเปลี่ยนรหัสผ่าน… | Changing password… |
| บัญชี {email} | Account {email} |
| รหัสผ่านปัจจุบัน / รหัสผ่านใหม่ / ยืนยันรหัสผ่านใหม่ | Current password / New password / Confirm new password |
| อย่างน้อย 12 ตัวอักษร | At least 12 characters |
| อุปกรณ์อื่นที่ใช้บัญชีนี้จะต้องเข้าสู่ระบบใหม่ | Other devices using this Account will have to sign in again. |
| กรุณากรอกรหัสผ่านปัจจุบัน | Please enter your current password |
| รหัสผ่านใหม่ต้องมีอย่างน้อย 12 ตัวอักษร | The new password needs at least 12 characters |
| รหัสผ่านใหม่ยาวได้ไม่เกิน 128 ตัวอักษร | The new password can be at most 128 characters |
| กรุณากรอกรหัสผ่านใหม่อีกครั้ง | Please enter the new password again |
| รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน | The new passwords don't match |
| รหัสผ่านปัจจุบันไม่ถูกต้อง | Wrong current password |
| พยายามเปลี่ยนรหัสผ่านหลายครั้งเกินไป กรุณารอ {n} วินาทีแล้วลองใหม่ | Too many attempts. Wait {n} seconds and try again. |
| พยายามเปลี่ยนรหัสผ่านหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่ | Too many attempts. Wait a moment and try again. |
| เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง | Couldn't change the password. Please try again. |
| เปลี่ยนรหัสผ่านแล้ว (toast) | Password changed |

## Overview (Registrations page, top)

| Thai | English |
| --- | --- |
| ผู้ลงทะเบียน (page title) | Registrations |
| ภาพรวม | Overview |
| ลงทะเบียนทั้งหมด | Total Registrations |
| {n} คน (big number) | {n} people |
| +{n} วันนี้ | +{n} today |
| ผู้ที่เลือกทั้ง 2 วันนับครั้งเดียว | People who chose both days count once |
| เช็คอินแล้ว {n} | Checked in {n} |
| (ไม่ได้ลงทะเบียนวันนี้ {n}) | ({n} not registered for this day) |
| ยังไม่ได้ส่งอีเมล Event Pass | Event Pass email not sent |
| ระบบอีเมลยังไม่ได้ตั้งค่า | Email isn't set up |
| ไปหน้าส่งอีเมล | Go to Email |
| ผู้ลงทะเบียนตามฐานะการเข้าร่วมงาน | Registrations by Attendee Role |
| ผู้ที่เลือกทั้ง 2 วันนับในแต่ละวัน | People who chose both days count on each day |
| ฐานะการเข้าร่วมงาน (table header) | Attendee Role |
| รวม | Total |
| กำลังโหลดจำนวนผู้ลงทะเบียน… | Loading Registration counts… |
| ผู้ลงทะเบียนใหม่รายวัน | New Registrations per day |
| ตั้งแต่วันที่มีผู้ลงทะเบียนคนแรกจนถึงวันนี้ ตามเวลาประเทศไทย | From the first Registration to today, Bangkok time |
| ยังไม่มีผู้ลงทะเบียน | No Registrations yet |
| กราฟจะแสดงเมื่อมีผู้ลงทะเบียนคนแรก | The chart appears with the first Registration |
| วันที่ / ผู้ลงทะเบียนใหม่ (table) | Date / New Registrations |
| กราฟผู้ลงทะเบียนใหม่รายวัน ตัวเลขแต่ละวันอยู่ในตารางถัดไป | Chart of new Registrations per day. Each day's number is in the table that follows. |
| ลงทะเบียนใหม่ (tooltip) | New Registrations |
| กำลังโหลดกราฟผู้ลงทะเบียนใหม่รายวัน… | Loading the daily Registrations chart… |

## Registration list

| Thai | English |
| --- | --- |
| รายการลงทะเบียน | Registrations |
| กำลังโหลดรายการลงทะเบียน… | Loading Registrations… |
| ค้นหา | Search |
| ชื่อ นามสกุล เบอร์โทรศัพท์ อีเมล หรือรหัส Event Pass | Name, phone, email or Pass Code |
| วันเข้าร่วมงาน / ทุกวัน | Event Day / All days |
| ฐานะการเข้าร่วมงาน / ทุกฐานะ | Attendee Role / All roles |
| ล้างตัวกรอง | Clear filters |
| พบ {n} รายการ | {n} found |
| ทั้งหมด {n} รายการ | {n} in total |
| ไม่มีรายการในหน้านี้ / กลับไปหน้าแรก | No Registrations on this page / Back to the first page |
| ไม่พบการลงทะเบียนที่ตรงกับการค้นหา | No Registrations match your search |
| ยังไม่มีการลงทะเบียน | No Registrations yet |
| โหลดรายการลงทะเบียนไม่สำเร็จ | Couldn't load Registrations |
| แสดง {from}–{to} จาก {total} รายการ | Showing {from}–{to} of {total} |
| แถวต่อหน้า | Rows per page |
| หน้า {p} จาก {n} | Page {p} of {n} |
| เลือกหน้า | Pages |
| หน้าแรก / ก่อนหน้า / ถัดไป / หน้าสุดท้าย | First page / Previous page / Next page / Last page |
| คอลัมน์ | Columns |
| ส่งออก CSV | Export CSV |
| ส่งออกทุกรายการที่ตรงกับการค้นหาและตัวกรอง (ทุกหน้า) | Export every Registration matching the search and filters (all pages) |
| รายละเอียด (column, link) | Details |
| ลงทะเบียนเมื่อ | Registered |
| ชื่อ / นามสกุล | Given name / Family name |
| ฐานะ | Attendee Role |
| วันเข้าร่วมงาน | Event Days |
| โทรศัพท์ | Phone |
| อีเมล | Email |
| อีเมล Event Pass | Event Pass email |
| รหัส Event Pass | Pass Code |
| ลบการลงทะเบียน {Pass Code} แล้ว (toast) | Deleted Registration {Pass Code} |

## Event Pass email (list cell and detail)

| Thai | English |
| --- | --- |
| ยังไม่ได้ส่ง | Not sent |
| ส่งแล้ว {n} ครั้ง | Sent {n} times (1: Sent once) |
| ล่าสุด {time} | last {time} |
| ส่งอีกครั้ง / กำลังส่ง… | Resend / Sending… |
| ส่ง Event Pass ไปที่ {email} อีกครั้ง? | Send the Event Pass to {email} again? |
| ส่ง | Send |
| ส่ง Event Pass แล้ว (toast) | Event Pass sent |
| ส่งไม่ได้ เพราะยังไม่ได้ตั้งค่าการส่งอีเมล (SMTP) | Can't send: email (SMTP) isn't set up |
| ไม่พบการลงทะเบียนนี้ อาจถูกลบไปแล้ว | Registration not found. It may have been deleted. |
| ส่งไม่สำเร็จ ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง | Couldn't send. Check your internet connection and try again. |
| ส่งไม่สำเร็จ: {reason} ({code}) | Couldn't send: {reason} ({code}) |
| เกินโควตาการส่งอีเมลต่อวันของบัญชีผู้ส่ง ส่งต่อได้เมื่อโควตารีเซ็ต | the sender's daily email quota is used up. Sending works again when the quota resets |
| เซิร์ฟเวอร์อีเมลไม่ยอมรับบัญชีผู้ส่ง ตรวจสอบการตั้งค่า SMTP | the email server refused the sender account. Check the SMTP settings |
| เชื่อมต่อเซิร์ฟเวอร์อีเมลไม่ได้ ลองอีกครั้งภายหลัง | couldn't connect to the email server. Try again later |
| เซิร์ฟเวอร์อีเมลไม่รับที่อยู่อีเมลนี้ ตรวจสอบอีเมลของผู้เข้าร่วมงาน | the email server refused this address. Check the Attendee's email |
| ยังไม่ได้ตั้งค่า APP_URL จึงสร้างลิงก์ Event Pass ไม่ได้ | APP_URL isn't set, so Event Pass links can't be built |
| เกิดข้อผิดพลาด ลองอีกครั้งภายหลัง | something went wrong. Try again later |

## Registration detail

| Thai | English |
| --- | --- |
| รายละเอียดการลงทะเบียน (tab title) | Registration details |
| กำลังโหลดรายละเอียดการลงทะเบียน… | Loading Registration details… |
| ผู้ลงทะเบียน › {Pass Code} (breadcrumb) | Registrations › {Pass Code} |
| ไม่พบการลงทะเบียนนี้ | Registration not found |
| อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง | It may have been deleted, or the link is wrong. |
| {Pass Code} · ลงทะเบียนเมื่อ {time} | {Pass Code} · Registered {time} |
| ข้อมูลการลงทะเบียน | Registration |
| รหัส Event Pass / ลิงก์ Event Pass / อีเมล Event Pass | Pass Code / Event Pass link / Event Pass email |
| ส่งลิงก์นี้ให้ผู้เข้าร่วมงานที่หา Event Pass ไม่พบ ใครมีลิงก์ก็เปิด Event Pass ได้ จึงควรส่งให้เจ้าของเท่านั้น | Send this link to an Attendee who can't find their Event Pass. Anyone with the link can open the Event Pass, so send it only to its holder. |
| ชื่อ / นามสกุล / เบอร์โทรศัพท์ / อีเมล | Given name / Family name / Phone / Email |
| ฐานะการเข้าร่วมงาน / วันเข้าร่วมงาน / ช่องทางที่ทราบข่าว | Attendee Role / Event Days / Referral Sources |
| ทีมที่ต้องการมาเชียร์ | Team cheering for |
| ความช่วยเหลือที่ต้องการในการเข้าร่วมงาน | Help needed to attend |
| ข้อสอบถามหรือข้อเสนอแนะ | Questions or suggestions |
| ไม่ได้ระบุ | Not given |
| คัดลอกลิงก์ / คัดลอกลิงก์แล้ว | Copy link / Link copied |
| คัดลอกไม่ได้ เลือกลิงก์ด้านบนแล้วคัดลอกเอง | Couldn't copy. Select the link above and copy it yourself. |
| เปิด Event Pass | Open Event Pass |
| สร้างลิงก์ไม่ได้ เพราะยังไม่ได้ตั้งค่า APP_URL | Can't build the link: APP_URL isn't set |
| การเช็คอิน | Check-Ins |
| ยังไม่ได้เช็คอิน | Not checked in |
| เช็คอินเมื่อ {time} | Checked in {time} |
| นอกวันที่ลงทะเบียน | not a registered day |
| ลบการลงทะเบียน (section, button) | Delete Registration |
| สำหรับการลงทะเบียนที่เป็นสแปมหรือการลงทะเบียนซ้ำ การเช็คอินของการลงทะเบียนนี้จะถูกลบไปด้วย | For spam and Duplicate Registrations. This Registration's Check-Ins are deleted with it. |
| ลบการลงทะเบียนของ {name} ({Pass Code}) ถาวร? Event Pass นี้จะใช้เช็คอินไม่ได้อีก และกู้คืนไม่ได้ | Permanently delete {name}'s Registration ({Pass Code})? This Event Pass can no longer be used to check in, and this can't be undone. |
| ลบถาวร / กำลังลบ… | Delete permanently / Deleting… |
| ไม่พบการลงทะเบียนนี้ อาจถูกลบไปแล้ว | Registration not found. It may have been deleted already. |
| กลับไปรายการลงทะเบียน | Back to Registrations |
| หมดเวลาการเข้าสู่ระบบ ยังไม่ได้ลบ | Session expired. Nothing was deleted. |
| ลบไม่สำเร็จ ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง | Couldn't delete. Check your internet connection and try again. |

## Email (bulk send)

| Thai | English |
| --- | --- |
| ส่งอีเมล Event Pass (tab title) | Email Event Passes |
| ส่งอีเมล (page title) | Email |
| ส่ง Event Pass ทางอีเมลถึงผู้ลงทะเบียนหลายคนพร้อมกัน เช่น หลังระบบอีเมลขัดข้องหรือเกินโควตา | Email Event Passes to many Attendees at once, for example after an email outage or a quota limit. |
| ส่งถึง | Send to |
| เฉพาะผู้ที่ยังไม่เคยได้รับ | Only those not yet sent |
| ผู้ลงทะเบียนที่ยังไม่เคยส่งอีเมล Event Pass สำเร็จ เช่น ช่วงที่ระบบอีเมลขัดข้อง | Attendees never successfully sent an Event Pass, for example during an email outage |
| ผู้ลงทะเบียนที่ยังไม่เคยได้รับ Event Pass | Attendees not yet sent an Event Pass |
| ทุกคน | Everyone |
| ผู้ลงทะเบียนทุกคน ผู้ที่เคยได้รับแล้วจะได้รับอีกฉบับ | Every Attendee. Those already sent one get another. |
| ผู้ลงทะเบียนทุกคน (recipients) | every Attendee |
| สรุปก่อนส่ง | Summary before sending |
| นับจำนวนอีเมลไม่สำเร็จ | Couldn't count the emails |
| กำลังนับจำนวนอีเมล… | Counting emails… |
| {n} ฉบับ | {n} emails |
| อีเมลที่จะส่งทั้งหมด ถึง{recipients} (1 ฉบับต่อผู้ลงทะเบียน 1 คน) | Emails to send, to {recipients} (one per Registration) |
| แยกตามวันเข้าร่วมงานที่เลือก | By Event Day chosen |
| ผู้ที่เลือกทั้ง 2 วันนับในแต่ละวัน แต่ได้รับอีเมลฉบับเดียว | People who chose both days count on each day but get one email. |
| ยังไม่ได้ตั้งค่าการส่งอีเมล (SMTP) จึงยังส่ง Event Pass ทางอีเมลไม่ได้ | Email (SMTP) isn't set up, so Event Passes can't be emailed yet. |
| ไม่มีอีเมลที่ต้องส่ง | No emails to send |
| ส่งอีเมล {n} ฉบับ… | Send {n} emails… |
| ยืนยันการส่งอีเมล Event Pass {n} ฉบับ | Send {n} Event Pass emails? |
| ส่งถึง{recipients} | To {recipients} |
| ผู้ที่เคยได้รับ Event Pass แล้วจะได้รับอีกฉบับ | Attendees already sent an Event Pass get another one |
| ส่งทีละชุด ชุดละไม่เกิน 25 ฉบับ เปิดหน้านี้ไว้จนกว่าจะส่งเสร็จ | Sent in batches of up to 25. Keep this page open until it finishes. |
| Gmail จำกัดจำนวนอีเมลต่อวัน (ประมาณ 500 ฉบับ หรือ 2,000 ฉบับสำหรับ Google Workspace) | Gmail limits emails per day (about 500, or 2,000 for Google Workspace). |
| ยืนยัน ส่ง {n} ฉบับ | Confirm: send {n} |
| หยุดการส่งแล้ว กด “ส่งต่อ” เพื่อส่งส่วนที่เหลือ | Sending stopped. Press “Resume” to send the rest. |
| อีเมลในชุดล่าสุดส่งไม่สำเร็จทั้งหมด จึงหยุดไว้ก่อน ตรวจสอบสาเหตุด้านล่าง แล้วกด “ส่งต่อ” | Every email in the last batch failed, so sending is paused. Check the reasons below, then press “Resume”. |
| ติดต่อเซิร์ฟเวอร์ไม่สำเร็จ ชุดล่าสุดอาจส่งไปแล้วบางส่วน กด “ส่งต่อ” เพื่อลองอีกครั้ง | Couldn't reach the server. Part of the last batch may have been sent. Press “Resume” to try again. |
| หมดเวลาการเข้าสู่ระบบ เข้าสู่ระบบในแท็บใหม่ แล้วกลับมากด “ส่งต่อ” | Session expired. Sign in in a new tab, then come back and press “Resume”. |
| ยังไม่ได้ตั้งค่าการส่งอีเมล (SMTP) จึงส่งไม่ได้ | Email (SMTP) isn't set up, so nothing can be sent. |
| ส่งสำเร็จ {n} ฉบับ · ไม่สำเร็จ {m} ฉบับ | {n} sent · {m} failed |
| ส่งอีเมล Event Pass เสร็จแล้ว (toast) | Event Pass emails sent |
| หยุดการส่งอีเมล Event Pass ไว้ (toast) | Event Pass emails paused |
| กำลังส่งอีเมล Event Pass… / หยุดการส่งไว้ / ส่งเสร็จแล้ว | Sending Event Pass emails… / Paused / Finished |
| หยุด / กำลังหยุดเมื่อจบชุดนี้… | Stop / Stopping after this batch… |
| {p} จาก {t} ฉบับ (progress, screen readers) | {p} of {t} emails |
| ดำเนินการแล้ว {p} จาก {t} ฉบับ | Processed {p} of {t} emails |
| เปิดหน้านี้ไว้จนกว่าจะส่งเสร็จ ถ้าออกจากหน้านี้ การส่งจะหยุดเมื่อจบชุดที่กำลังส่ง | Keep this page open until it finishes. If you leave, sending stops after the current batch. |
| ส่งต่อ | Resume |
| ยกเลิกส่วนที่เหลือ | Cancel the rest |
| เริ่มการส่งใหม่ | Start a new send |
| ส่งไม่สำเร็จ {n} ฉบับ | {n} failed |
| ผู้ที่ยังไม่เคยได้รับ Event Pass จะรวมอยู่ในการส่งแบบ “เฉพาะผู้ที่ยังไม่เคยได้รับ” ครั้งถัดไป | Attendees never sent an Event Pass are included in the next “Only those not yet sent” send. |

## Check-in desk

| Thai | English |
| --- | --- |
| เช็คอิน (title) | Check-In |
| วันเข้าร่วมงานที่เช็คอิน | Event Day to check in for |
| วันนี้ | Today |
| วันนี้ไม่ใช่วันจัดงาน เลือกวันเข้าร่วมงานที่จะเช็คอิน เช่น เพื่อทดสอบก่อนงาน | Today isn't an Event Day. Choose the Event Day to check in for, for example to test before the Event. |
| {วันนี้ไม่ใช่วันจัดงาน \| ไม่ใช่วันนี้}: การเช็คอินจะบันทึกเป็น{day} | {Today isn't an Event Day \| Not today}: Check-Ins are recorded for {day} |
| ผลการเช็คอินจะแสดงที่นี่ | Check-In results appear here |
| Pass Code หรือลิงก์ Event Pass | Pass Code or Event Pass link |
| เช่น EP-7KQ2MZ9H | e.g. EP-7KQ2MZ9H |
| เช็คอิน (button) | Check in |
| พิมพ์ Pass Code ตัวพิมพ์เล็กหรือใหญ่ มีขีดหรือเว้นวรรคก็ได้ หรือวางลิงก์ Event Pass แล้วกด Enter | Type the Pass Code in any case, with or without hyphens or spaces, or paste an Event Pass link, then press Enter. |
| โหมด Kiosk: จุดเช็คอินด้วยตนเอง | Kiosk mode: self check-in |
| สำหรับ iPad ที่ผู้เข้าร่วมงานแสดง Event Pass ที่กล้องหน้าเอง … ออกจากโหมดนี้ได้ที่ปุ่ม “เจ้าหน้าที่” มุมขวาบน | For an iPad where Attendees show their Event Pass to the front camera themselves: full screen, with Thai and English instructions, and no menu, Pass Code entry or day choice. Check-Ins are recorded for the day chosen above. Leave it with the “Staff” button in the top-right corner. |
| เปิดโหมด Kiosk | Start Kiosk mode |
| บุ๊กมาร์กหน้านี้โดยเติม ?kiosk=1 ท้ายลิงก์ เพื่อเปิดเข้าโหมด Kiosk โดยตรง | Bookmark this page with ?kiosk=1 at the end of the link to open Kiosk mode directly. |
| iPad ที่วางไว้ให้ผู้เข้าร่วมงานใช้เองโดยไม่มีเจ้าหน้าที่อยู่ ให้เข้าสู่ระบบด้วยบัญชี Kiosk แทน บัญชีนี้เปิดได้เฉพาะหน้า Kiosk และไม่เห็นข้อมูลผู้ลงทะเบียน | An iPad left for Attendees with no Staff nearby should sign in with a Kiosk Account instead. That Account opens only the Kiosk page and sees no Registration data. |

### Check-In results at the desk

The Kiosk keeps its Thai heading and English note unchanged.

| Thai heading (Kiosk, unchanged) | English heading at the desk |
| --- | --- |
| กำลังตรวจสอบ… | Checking… |
| เช็คอินสำเร็จ | Checked in |
| เช็คอินแล้วเมื่อ {time} | Already checked in at {time} |
| ไม่ได้ลงทะเบียนวันนี้ | Not registered for this day |
| ไม่ใช่ Event Pass | Not an Event Pass |
| วันนี้ไม่ใช่วันจัดงาน | Today isn't an Event Day |
| เช็คอินไม่สำเร็จ | Check-In didn't go through |
| หมดเวลาเข้าสู่ระบบ | Session expired |

| Thai detail line | English |
| --- | --- |
| ไม่ได้บันทึกซ้ำ ตรวจสอบว่าเป็นเจ้าของ Event Pass | Not recorded again. Check that this is the Event Pass holder. |
| (ไม่ได้ลงทะเบียนวันนี้) | (not registered for this day) |
| บันทึกการเช็คอินแล้ว | Check-In recorded |
| ลงทะเบียนไว้: {days} | Registered for: {days} |
| ไม่ได้บันทึกการเช็คอิน ตรวจสอบรหัสแล้วลองอีกครั้ง | No Check-In recorded. Check the code and try again. |
| เลือกวันเข้าร่วมงานที่จะเช็คอินด้านบน แล้วกดเช็คอินอีกครั้ง ยังไม่ได้บันทึกการเช็คอิน | Choose the Event Day above, then press Check in again. No Check-In recorded yet. |
| ยังไม่ได้บันทึกการเช็คอิน เข้าสู่ระบบอีกครั้ง | No Check-In recorded. Sign in again |
| เกิดข้อผิดพลาดในการเชื่อมต่อ ยังไม่ได้บันทึกการเช็คอิน กดเช็คอินอีกครั้ง | Connection problem. No Check-In recorded. Press Check in again. |
| เช็คอินสำหรับ{day} | Check-In for {day} |

### Camera

The desk shows the English text. The Kiosk shows the Thai text, then the English.

| Thai | English |
| --- | --- |
| กล้องหน้า / กล้องหลัง | front camera / back camera |
| สแกน QR ด้วยกล้อง | Scan a QR with the camera |
| เปิดกล้องสแกน QR | Open camera to scan QR |
| กำลังเปิดกล้อง… | Opening the camera… |
| เปิดกล้องอีกครั้ง | Open the camera again |
| สลับเป็น{camera} | Switch to {camera} |
| ปิดกล้อง | Turn off camera |
| QR นี้ไม่ใช่ Event Pass | This QR isn't an Event Pass |
| เบราว์เซอร์เปิดกล้องได้เฉพาะหน้าเว็บที่เป็น https | The browser can open the camera only on an https page |
| ไม่ได้รับอนุญาตให้ใช้กล้อง อนุญาตให้เว็บไซต์นี้ใช้กล้องในการตั้งค่าเบราว์เซอร์ แล้วลองอีกครั้ง | Camera access was denied. Allow this site to use the camera in the browser settings, then try again. |
| ไม่พบกล้องบนอุปกรณ์นี้ | No camera found on this device |
| กล้องอาจถูกแอปอื่นใช้อยู่ ปิดแอปนั้นแล้วลองอีกครั้ง | Another app may be using the camera. Close it and try again. |
| เบราว์เซอร์นี้ใช้กล้องไม่ได้ ลองเปิดด้วย Safari หรือ Chrome | This browser can't use the camera. Try Safari or Chrome. |
| เปิด{camera}ไม่ได้: {problem} | Couldn't open the {camera}: {problem} |
| เปลี่ยนเป็น{camera}ไม่ได้: {problem} | Couldn't switch to the {camera}: {problem} |
| … กลับมาใช้{camera}แล้ว | … Back to the {camera}. |
| … และเปิด{camera}อีกครั้งไม่ได้ กดเปิดกล้องเพื่อลองใหม่ | … and couldn't reopen the {camera}. Press Open camera to try again. |
| ปิดกล้องไม่ได้ ลองอีกครั้ง หรือโหลดหน้านี้ใหม่ | Couldn't turn off the camera. Try again, or reload this page. |

## Kiosk: Staff-only parts

The Attendee-facing Kiosk screens are unchanged.

| Thai | English |
| --- | --- |
| เจ้าหน้าที่ (corner button) | เจ้าหน้าที่ · Staff |
| สำหรับเจ้าหน้าที่ (panel name) | For Staff |
| ออกจากระบบ Kiosk นี้? | Sign this Kiosk out? |
| หลังออกจากระบบ จุดนี้จะเช็คอินไม่ได้จนกว่าจะเข้าสู่ระบบด้วยบัญชี Kiosk อีกครั้ง | After signing out, this Kiosk can't record Check-Ins until it is signed in with a Kiosk Account again. |
| ออกจากโหมด Kiosk? | Leave Kiosk mode? |
| กลับไปหน้าเช็คอินของเจ้าหน้าที่ ที่มีช่องพิมพ์ Pass Code การเลือกวัน และเมนู | Back to the Staff check-in desk, with Pass Code entry, the day choice and the menu. |
| เข้าสู่ระบบในชื่อ {name} | Signed in as {name} |
| วันนี้ไม่ใช่วันจัดงาน จุดนี้จะเช็คอินได้ในวันจัดงานเท่านั้น | Today isn't an Event Day. This Kiosk records Check-Ins on Event Days only. |
| วันนี้ไม่ใช่วันจัดงาน การเช็คอินจะไม่สำเร็จ ออกจากโหมดนี้แล้วเลือกวันเข้าร่วมงานเพื่อทดสอบ | Today isn't an Event Day, so Check-Ins will fail. Leave this mode and choose an Event Day to test. |
| บันทึกการเช็คอินเป็น{day} (ไม่ใช่วันนี้) | Recording Check-Ins for {day} (not today) |
| เช็คอินสำหรับ{day} (วันนี้) | Checking in for {day} (today) |
| หน้าจอจะเปิดค้างไว้ขณะอยู่ในโหมด Kiosk | The screen stays on in Kiosk mode |
| ยังสั่งให้หน้าจอเปิดค้างไม่ได้ ปิดการล็อกอัตโนมัติ (Auto-Lock) ในการตั้งค่า iPad | Can't keep the screen on. Turn off Auto-Lock in the iPad's Settings. |
| ออกจากโหมด Kiosk | Leave Kiosk mode |
| ออกจากระบบ / กำลังออกจากระบบ… | Sign out / Signing out… |

## CSV export

The file stays UTF-8 with BOM, and the filename is unchanged. Values use the formats above.

| Thai header | English header |
| --- | --- |
| ลงทะเบียนเมื่อ | Registered (Bangkok time) |
| รหัส Event Pass | Pass Code |
| ชื่อ | Given name |
| นามสกุล | Family name |
| เบอร์โทรศัพท์ | Phone |
| เบอร์โทรศัพท์ (E.164) | Phone (E.164) |
| อีเมล | Email |
| ฐานะการเข้าร่วมงาน | Attendee Role |
| ฐานะการเข้าร่วมงาน (ระบุ) | Attendee Role (other) |
| โรงเรียน / สถาบันการศึกษา / บริษัท / หน่วยงาน | School or organisation |
| วันเข้าร่วมงาน | Event Days |
| ช่องทางที่ทราบข่าว | Referral Sources |
| ช่องทางที่ทราบข่าว (ระบุ) | Referral Source (other) |
| ทีมที่ต้องการมาเชียร์ | Team cheering for |
| ความช่วยเหลือที่ต้องการ | Help needed |
| ข้อสอบถามหรือข้อเสนอแนะ | Questions or suggestions |
| ส่งอีเมล Event Pass แล้ว (ครั้ง) | Event Pass emails sent |
| ส่งอีเมล Event Pass ล่าสุดเมื่อ | Last Event Pass email (Bangkok time) |
