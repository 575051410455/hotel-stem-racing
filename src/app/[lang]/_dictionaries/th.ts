// Thai wording for the public pages: today's text, from .scratch/thai-english/copy-public.md.
// The English dictionary must have exactly these keys (see ./index.ts).

import { event, eventDateRangeLabel, eventVenue } from "@/lib/event";
import { SUBMISSION_WINDOW_MINUTES } from "@/lib/registrations/bot-protection";

const dateRange = eventDateRangeLabel("th");
const venue = eventVenue("th");

export const th = {
  languageToggleName: "เลือกภาษา",
  skipLink: "ข้ามไปยังเนื้อหาหลัก",
  homeLinkName: "STEM Racing Thailand หน้าแรก",
  contactListName: "ช่องทางติดต่อผู้จัดงาน",
  registrationPage: {
    title: `ลงทะเบียนเข้าร่วมงาน ${event.name}`,
    description: `ลงทะเบียนเข้าร่วมงาน ${event.name} ${dateRange} ณ ${venue}`,
    bannerAlt: `${event.name} National Finals — Grand Richmond`,
    heading: `ลงทะเบียนเข้าร่วมงาน ${event.name}`,
    introduction: `ขอเชิญร่วมสัมผัสบรรยากาศการแข่งขัน ${event.name} และส่งกำลังใจให้เยาวชนผู้เข้าร่วมการแข่งขัน`,
    dateAndVenue: `วันที่ ${dateRange} · ${venue}`,
    loading: "กำลังโหลดแบบฟอร์มลงทะเบียน…",
  },
  registrationForm: {
    formName: "แบบฟอร์มลงทะเบียนเข้าร่วมงาน",
    intro: "กรุณากรอกข้อมูลเพื่อลงทะเบียนเข้าร่วมงาน",
    requiredKey: "หมายถึงข้อมูลที่จำเป็นต้องกรอก",
    requiredForScreenReaders: "(จำเป็น)",
    givenName: "ชื่อ",
    familyName: "นามสกุล",
    phone: "เบอร์โทรศัพท์",
    phoneHint: "เบอร์มือถือหรือเบอร์บ้าน หรือเบอร์ต่างประเทศขึ้นต้นด้วย + และรหัสประเทศ",
    phonePlaceholder: "081-234-5678",
    email: "อีเมล",
    emailPlaceholder: "name@example.com",
    roleQuestion: "ท่านเข้าร่วมงานในฐานะใด",
    chooseOne: "(เลือก 1 ข้อ)",
    chooseOneOrMore: "(เลือกได้มากกว่า 1 ข้อ)",
    roleOther: "โปรดระบุฐานะการเข้าร่วมงาน",
    organisationHintSponsor: "กรุณาระบุชื่อบริษัท องค์กร หรือหน่วยงานที่ท่านเป็นตัวแทน",
    organisationHintOthers: "หากไม่มี สามารถเว้นว่างได้",
    eventDaysQuestion: "วันที่ต้องการเข้าร่วมงาน",
    referralQuestion: "ท่านทราบข่าวการจัดงานจากช่องทางใด",
    referralOther: "โปรดระบุช่องทางที่ทราบข่าว",
    competingTeamCheeredFor: "ชื่อทีมที่ท่านต้องการมาเชียร์ (ถ้ามี)",
    accessibilityNeeds: "ความช่วยเหลือที่ต้องการในการเข้าร่วมงาน (ถ้ามี)",
    accessibilityHints: ["เช่น การอำนวยความสะดวกสำหรับผู้ใช้รถเข็น", "ไม่จำเป็นต้องระบุข้อมูลสุขภาพหรือการวินิจฉัยโรค"],
    comments: "ข้อสอบถามหรือข้อเสนอแนะเพิ่มเติม",
    submit: "ลงทะเบียน",
    submitting: "กำลังลงทะเบียน…",
    privacyNote:
      "ข้อมูลที่ท่านกรอกจะใช้สำหรับจัดการลงทะเบียน ติดต่อเกี่ยวกับการเข้าร่วมงาน และวางแผนรองรับผู้เข้าร่วมงาน",
    onePerForm: "กรุณาลงทะเบียน 1 คนต่อ 1 แบบฟอร์ม",
  },
  botProtection: {
    loadFailed:
      "โหลดระบบตรวจสอบความปลอดภัยไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต แล้วโหลดหน้านี้ใหม่",
    error: "ระบบตรวจสอบความปลอดภัยขัดข้อง",
    unsupported: "เบราว์เซอร์นี้ไม่รองรับระบบตรวจสอบความปลอดภัย กรุณาอัปเดตหรือเปลี่ยนเบราว์เซอร์",
    didNotPass: "การตรวจสอบความปลอดภัยไม่ผ่าน กรุณารอให้การตรวจสอบด้านบนเสร็จสิ้น แล้วกดลงทะเบียนอีกครั้ง",
    rateLimited: `มีการส่งแบบฟอร์มจากเครือข่ายนี้บ่อยเกินไป กรุณารอประมาณ ${SUBMISSION_WINDOW_MINUTES} นาที แล้วลองใหม่อีกครั้ง`,
    retry: "ลองอีกครั้ง",
  },
  /** `{email}` marks where the masked email goes. */
  duplicateRegistration: {
    heading: "ท่านลงทะเบียนแล้ว",
    resent: "เราได้ส่ง Event Pass ไปที่ {email} อีกครั้ง",
    spamHint: "หากไม่พบในกล่องจดหมาย กรุณาตรวจสอบโฟลเดอร์จดหมายขยะ (Spam)",
    checkInbox: "กรุณาตรวจสอบ Event Pass ในกล่องจดหมายของอีเมลที่ท่านใช้ลงทะเบียน ({email}) รวมถึงโฟลเดอร์จดหมายขยะ (Spam)",
    registeredWith: "ท่านลงทะเบียนไว้ด้วยอีเมล {email}",
    stillNotFound: "หากยังไม่พบ กรุณาติดต่อผู้จัดงาน",
    wantItAgain: "หากต้องการรับ Event Pass อีกครั้ง กรุณาติดต่อผู้จัดงาน",
    registerSomeoneElse: "ลงทะเบียนให้ผู้อื่น",
  },
  registrationClosed: {
    heading: "ปิดรับลงทะเบียนแล้ว",
    body: `ขณะนี้ปิดรับลงทะเบียนเข้าร่วมงาน ${event.name} แล้ว ขอขอบคุณทุกท่านที่ให้ความสนใจ`,
    questions: "หากมีข้อสงสัย กรุณาติดต่อผู้จัดงาน",
  },
  eventPassPage: {
    title: `บัตรเข้างาน ${event.name}`,
    thankYou: `ขอบคุณสำหรับการลงทะเบียนเข้าร่วมงาน ${event.name} 🏁`,
    seeYou: `แล้วพบกันในวันที่ท่านเลือก ณ ${venue}`,
    saveThis: "กรุณาบันทึกหน้านี้หรือบันทึกภาพหน้าจอไว้ เพื่อแสดง QR ที่ทางเข้างาน",
    loading: "กำลังโหลดบัตรเข้างาน…",
  },
  /** `{passCode}` and `{file}` mark where the Pass Code and the image's file name go. */
  eventPassCard: {
    title: `บัตรเข้างาน ${event.name}`,
    dateAndVenue: `วันที่ ${dateRange} · ${venue}`,
    venue,
    qrName: "QR บัตรเข้างาน รหัส {passCode}",
    passCodeLabel: "รหัส Event Pass",
    passCodeHint: "ถ้าสแกนไม่ได้ แจ้งรหัสนี้",
    nameLabel: "ชื่อ–นามสกุล",
    daysLabel: "วันที่เข้าร่วมงาน",
    saveButton: "บันทึก Event Pass",
    saving: "กำลังสร้างไฟล์…",
    fileHint: "ไฟล์รูปภาพ {file} สำหรับเก็บไว้ในเครื่องหรือพิมพ์",
    downloadStarted: "เริ่มดาวน์โหลดไฟล์ {file} แล้ว",
    preview: "กดค้างที่รูปด้านล่างเพื่อบันทึกลงในเครื่อง",
    saveFailed: "บันทึกไฟล์ไม่สำเร็จ กรุณาบันทึกภาพหน้าจอหน้านี้ไว้แทน",
    imageAlt: "บัตรเข้างาน รหัส {passCode}",
  },
  eventPassNotFound: {
    heading: "ไม่พบบัตรเข้างานนี้",
    body: "ลิงก์อาจไม่ถูกต้องหรือไม่ครบถ้วน กรุณาตรวจสอบลิงก์อีกครั้ง หรือติดต่อผู้จัดงาน",
    action: "ไปที่แบบฟอร์มลงทะเบียน",
  },
  /** The bilingual 404 (src/app/global-not-found.tsx): unknown addresses and unknown Event Pass links. */
  pageNotFound: {
    heading: "ไม่พบหน้านี้",
    body: "ลิงก์อาจไม่ถูกต้องหรือไม่ครบถ้วน หากเป็นลิงก์บัตรเข้างาน กรุณาตรวจสอบลิงก์ในอีเมลอีกครั้ง หรือติดต่อผู้จัดงาน",
    action: "ไปที่แบบฟอร์มลงทะเบียน",
  },
};
