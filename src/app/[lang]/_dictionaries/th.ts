// Thai wording for the public pages: today's text, from .scratch/thai-english/copy-public.md.
// The English dictionary must have exactly these keys (see ./index.ts).

import { event, eventDateRangeLabel, eventVenue } from "@/lib/event";

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
  registrationClosed: {
    heading: "ปิดรับลงทะเบียนแล้ว",
    body: `ขณะนี้ปิดรับลงทะเบียนเข้าร่วมงาน ${event.name} แล้ว ขอขอบคุณทุกท่านที่ให้ความสนใจ`,
    questions: "หากมีข้อสงสัย กรุณาติดต่อผู้จัดงาน",
  },
  eventPassNotFound: {
    heading: "ไม่พบบัตรเข้างานนี้",
    body: "ลิงก์อาจไม่ถูกต้องหรือไม่ครบถ้วน กรุณาตรวจสอบลิงก์อีกครั้ง หรือติดต่อผู้จัดงาน",
    action: "ไปที่แบบฟอร์มลงทะเบียน",
  },
  pageNotFound: {
    title: "ไม่พบหน้านี้",
    heading: "ไม่พบหน้านี้",
    body: "ลิงก์อาจไม่ถูกต้อง กรุณาตรวจสอบลิงก์อีกครั้ง",
    action: "ไปที่แบบฟอร์มลงทะเบียน",
  },
};
