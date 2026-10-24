// Event Pass email: a pure builder from an EventPassMessage to subject, HTML, plain text and
// inline attachments. Email HTML rules: tables and inline styles only (no <style>), VML for
// Outlook where a background is used, and every Attendee-entered value HTML-escaped.

import QRCode from "qrcode";
import { event, eventVenue } from "../event";
import type { EventPassMessage } from "../registrations/ports";
import { formatEventDates, type OpeningHours } from "./event-dates";
import { escapeHtml, readableTextColor } from "./html";

/** An image the HTML shows through `cid:`; the shape nodemailer accepts as an attachment. */
export type InlineAttachment = {
  filename: string;
  content: Buffer;
  contentType: "image/png" | "image/jpeg";
  cid: string;
  contentDisposition: "inline";
};

export type EventPassEmail = {
  subject: string;
  html: string;
  text: string;
  attachments: InlineAttachment[];
};

export type EventPassEmailOptions = {
  /** The email-sized banner JPEG (public/brand/banner-email.jpg). Without it the header is text only. */
  banner?: Buffer;
  /** Daily opening hours to show next to the dates; defaults to EVENT_OPENING_HOURS. */
  openingHours?: OpeningHours;
};

export const QR_CID = "event-pass-qr";
export const BANNER_CID = "event-pass-banner";

/**
 * Opening hours are not confirmed yet, so emails show dates only. Once the organisers confirm,
 * set this (Bangkok time), e.g. `{ opens: "09:00", closes: "17:00" }`.
 */
export const EVENT_OPENING_HOURS: OpeningHours | undefined = undefined;

const BRAND = {
  accent: "#c9361d",
  gradient: ["#7e1857", "#d83e22", "#e07225", "#ddb41e"],
  page: "#f4f4f7",
  card: "#ffffff",
  ink: "#1f2329",
  muted: "#5b6470",
  rule: "#e6e6ec",
} as const;

// Outlook for Windows renders with the first font in the stack only, so a Windows font leads.
const FONT =
  "'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, 'Leelawadee UI', 'Noto Sans Thai', Tahoma, sans-serif";
const MONO = "Consolas, Menlo, Monaco, 'Courier New', monospace";

/** Short conditions shown on every Event Pass email, Thai then English. */
const CONDITIONS = [
  { th: "แสดง QR นี้ที่ทางเข้างาน", en: "Show this QR at the entrance." },
  { th: "บัตรเข้างาน 1 ใบ ใช้ได้ 1 ท่าน", en: "One Event Pass per person." },
  { th: "โปรดมาในวันที่ท่านลงทะเบียนไว้", en: "Please come on the day(s) you registered for." },
];

const SIGNATURE = {
  th: `ทีมผู้จัดงาน ${event.name}`,
  en: `The ${event.name} organising team`,
};

const CTA_LABEL = "เปิดบัตรเข้างาน / Open Event Pass";
const SCAN_FALLBACK = { th: "ถ้าสแกนไม่ได้ แจ้งรหัสนี้", en: "If the QR won't scan, give this code." };

export async function buildEventPassEmail(
  message: EventPassMessage,
  options: EventPassEmailOptions = {},
): Promise<EventPassEmail> {
  const { pass, passLink } = message;
  const name = `${pass.givenName} ${pass.familyName}`;
  const dates = formatEventDates(pass.eventDays, options.openingHours ?? EVENT_OPENING_HOURS);

  const subject = `บัตรเข้างาน ${event.name} (Event Pass)`;

  // The file name is the Pass Code, never the token.
  const attachments: InlineAttachment[] = [
    {
      filename: `${pass.passCode}.png`,
      content: await QRCode.toBuffer(passLink, { width: 220, margin: 2, errorCorrectionLevel: "M" }),
      contentType: "image/png",
      cid: QR_CID,
      contentDisposition: "inline",
    },
  ];
  if (options.banner) {
    attachments.push({
      filename: "banner.jpg",
      content: options.banner,
      contentType: "image/jpeg",
      cid: BANNER_CID,
      contentDisposition: "inline",
    });
  }

  const text = [
    `เรียน คุณ${name}`,
    `ขอบคุณที่ลงทะเบียนเข้าร่วมงาน ${event.name} นี่คือบัตรเข้างาน (Event Pass) ของท่าน`,
    "",
    `Dear ${name},`,
    `Thank you for registering for ${event.name}. Here is your Event Pass.`,
    "",
    `งาน / Event: ${event.name}`,
    `วันที่: ${dates.th}`,
    `Date: ${dates.en}`,
    `สถานที่: ${eventVenue("th")}`,
    `Venue: ${eventVenue("en")}`,
    `ผู้เข้าร่วมงาน / Attendee: ${name}`,
    "",
    `รหัส Event Pass / Pass Code: ${pass.passCode}`,
    `${SCAN_FALLBACK.th} (${SCAN_FALLBACK.en})`,
    "",
    "เปิดบัตรเข้างาน / Open your Event Pass:",
    passLink,
    "",
    ...CONDITIONS.map((condition) => `- ${condition.th} / ${condition.en}`),
    "",
    SIGNATURE.th,
    SIGNATURE.en,
  ].join("\n");

  const html = renderHtml({
    name: escapeHtml(name),
    to: escapeHtml(message.to),
    passCode: escapeHtml(pass.passCode),
    passLink: escapeHtml(passLink),
    datesTh: escapeHtml(dates.th),
    datesEn: escapeHtml(dates.en),
    hasBanner: Boolean(options.banner),
  });

  return { subject, html, text, attachments };
}

/** Every string passed in is already HTML-escaped. */
type HtmlValues = {
  hasBanner: boolean;
  name: string;
  to: string;
  passCode: string;
  passLink: string;
  datesTh: string;
  datesEn: string;
};

function renderHtml(values: HtmlValues): string {
  const eventName = escapeHtml(event.name);

  return `<!DOCTYPE html>
<html lang="th" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${eventName} · Event Pass</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${BRAND.page};">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${BRAND.page};">บัตรเข้างานของท่านพร้อมแล้ว แสดง QR นี้ที่ทางเข้างาน · Your Event Pass is ready. Show the QR at the entrance.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.page}" style="background-color:${BRAND.page};">
<tr><td align="center" style="padding:24px 12px;">
<!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.card}" style="width:100%;max-width:600px;background-color:${BRAND.card};border-radius:12px;">
${header(eventName, values.hasBanner)}
<tr><td style="padding:28px 28px 0;font-family:${FONT};font-size:16px;line-height:1.6;color:${BRAND.ink};">
<p style="font-family:${FONT};margin:0 0 4px;font-size:18px;font-weight:bold;">เรียน คุณ${values.name}</p>
<p style="font-family:${FONT};margin:0 0 16px;">ขอบคุณที่ลงทะเบียนเข้าร่วมงาน ${eventName} นี่คือบัตรเข้างาน (Event Pass) ของท่าน</p>
<p style="font-family:${FONT};margin:0 0 4px;font-size:15px;font-weight:bold;color:${BRAND.muted};">Dear ${values.name},</p>
<p style="font-family:${FONT};margin:0;font-size:15px;color:${BRAND.muted};">Thank you for registering for ${eventName}. Here is your Event Pass.</p>
</td></tr>
<tr><td style="padding:20px 28px 0;">
${detailsTable([
  ["งาน", "Event", eventName],
  ["วันที่", "Date", `${values.datesTh}<br><span style="color:${BRAND.muted};">${values.datesEn}</span>`],
  ["สถานที่", "Venue", `${escapeHtml(eventVenue("th"))}<br><span style="color:${BRAND.muted};">${escapeHtml(eventVenue("en"))}</span>`],
  ["ผู้เข้าร่วมงาน", "Attendee", values.name],
])}
</td></tr>
<tr><td align="center" style="padding:28px 28px 0;">
<img src="cid:${QR_CID}" width="220" height="220" alt="QR บัตรเข้างาน / Event Pass QR" style="display:block;width:220px;height:220px;border:0;outline:none;text-decoration:none;">
</td></tr>
<tr><td align="center" style="padding:12px 28px 0;font-family:${MONO};font-size:30px;line-height:1.2;font-weight:bold;letter-spacing:3px;color:#111111;">${values.passCode}</td></tr>
<tr><td align="center" style="padding:6px 28px 0;font-family:${FONT};font-size:14px;line-height:1.5;color:${BRAND.muted};">${SCAN_FALLBACK.th}<br>${escapeHtml(SCAN_FALLBACK.en)}</td></tr>
<tr><td align="center" style="padding:24px 28px 0;">
${button(values.passLink, escapeHtml(CTA_LABEL))}
</td></tr>
<tr><td style="padding:16px 28px 0;font-family:${FONT};font-size:13px;line-height:1.5;color:${BRAND.muted};">
ถ้าปุ่มกดไม่ได้ เปิดลิงก์นี้ / If the button doesn't work, open this link:<br>
<a href="${values.passLink}" target="_blank" style="color:${BRAND.accent};text-decoration:underline;word-break:break-all;">${values.passLink}</a>
</td></tr>
<tr><td style="padding:24px 28px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid ${BRAND.rule};font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>
<tr><td style="padding:16px 28px 0;font-family:${FONT};font-size:14px;line-height:1.6;color:${BRAND.ink};">
${conditionsList()}
</td></tr>
<tr><td style="padding:20px 28px 28px;font-family:${FONT};font-size:14px;line-height:1.6;color:${BRAND.ink};">
ด้วยความเคารพ / Kind regards<br>
<strong>${escapeHtml(SIGNATURE.th)}</strong><br>
<span style="color:${BRAND.muted};">${escapeHtml(SIGNATURE.en)}</span>
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
<tr><td align="center" style="padding:0 24px 24px;font-family:${FONT};font-size:12px;line-height:1.5;color:${BRAND.muted};">
อีเมลนี้ส่งถึง ${values.to} เพราะมีการลงทะเบียนเข้าร่วมงาน ${eventName} ด้วยอีเมลนี้<br>
You are receiving this because this address was used to register for ${eventName}.
</td></tr>
</table>
</body>
</html>`;
}

function header(eventName: string, hasBanner: boolean): string {
  const [from, , , to] = BRAND.gradient;
  const stops = BRAND.gradient.map((colour, index) => `${Math.round((index / 3) * 100)}% ${colour}`);
  const vmlStops = BRAND.gradient.map((colour, index) => `${(index / 3).toFixed(2)} ${colour}`);

  const banner = hasBanner
    ? `<tr><td style="padding:0;font-size:0;line-height:0;">
<img src="cid:${BANNER_CID}" width="600" alt="${eventName}" style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;text-decoration:none;border-radius:12px 12px 0 0;">
</td></tr>
`
    : "";
  const barRadius = hasBanner ? "" : "border-radius:12px 12px 0 0;";

  return `${banner}<tr><td height="6" bgcolor="${BRAND.gradient[1]}" style="height:6px;font-size:0;line-height:0;background-color:${BRAND.gradient[1]};background-image:linear-gradient(90deg, ${stops.join(", ")});${barRadius}">
<!--[if gte mso 9]><v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:6px;"><v:fill type="gradient" color="${from}" color2="${to}" colors="${vmlStops.join(";")}" angle="90" /><v:textbox inset="0,0,0,0"><![endif]-->
<div style="height:6px;font-size:0;line-height:0;">&nbsp;</div>
<!--[if gte mso 9]></v:textbox></v:rect><![endif]-->
</td></tr>
<tr><td align="center" style="padding:24px 28px 0;font-family:${FONT};color:${BRAND.ink};">
<h1 style="font-family:${FONT};margin:0;font-size:24px;line-height:1.3;font-weight:bold;">${eventName}</h1>
<p style="font-family:${FONT};margin:4px 0 0;font-size:15px;color:${BRAND.muted};">บัตรเข้างาน · Event Pass</p>
</td></tr>`;
}

/** Rows of [Thai label, English label, value HTML]. */
function detailsTable(rows: [string, string, string][]): string {
  const cells = rows
    .map(
      ([th, en, value], index) => `<tr>
<td valign="top" width="38%" style="padding:10px 12px 10px 0;${index > 0 ? `border-top:1px solid ${BRAND.rule};` : ""}font-family:${FONT};font-size:13px;line-height:1.5;color:${BRAND.muted};">${th}<br>${en}</td>
<td valign="top" style="padding:10px 0;${index > 0 ? `border-top:1px solid ${BRAND.rule};` : ""}font-family:${FONT};font-size:15px;line-height:1.5;color:${BRAND.ink};font-weight:bold;">${value}</td>
</tr>`,
    )
    .join("\n");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
${cells}
</table>`;
}

/** A bulletproof button: VML for Outlook for Windows, a padded link everywhere else. */
function button(href: string, label: string): string {
  const background = BRAND.accent;
  const color = readableTextColor(background);

  return `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:52px;v-text-anchor:middle;width:340px;" arcsize="16%" stroke="f" fillcolor="${background}"><w:anchorlock/><center style="color:${color};font-family:${FONT};font-size:16px;font-weight:bold;">${label}</center></v:roundrect><![endif]-->
<!--[if !mso]><!-- --><a href="${href}" target="_blank" style="display:inline-block;background-color:${background};color:${color};font-family:${FONT};font-size:16px;line-height:20px;font-weight:bold;text-decoration:none;padding:16px 32px;border-radius:8px;">${label}</a><!--<![endif]-->`;
}

function conditionsList(): string {
  const items = CONDITIONS.map(
    (condition) => `<tr>
<td valign="top" width="16" style="padding:0 0 8px;font-family:${FONT};font-size:14px;line-height:1.6;color:${BRAND.accent};">&bull;</td>
<td valign="top" style="padding:0 0 8px;font-family:${FONT};font-size:14px;line-height:1.6;color:${BRAND.ink};">${escapeHtml(condition.th)}<br><span style="color:${BRAND.muted};">${escapeHtml(condition.en)}</span></td>
</tr>`,
  ).join("\n");

  return `<p style="font-family:${FONT};margin:0 0 8px;font-weight:bold;">ข้อควรทราบ / Good to know</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${items}
</table>`;
}
