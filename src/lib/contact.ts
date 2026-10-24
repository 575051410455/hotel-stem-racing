// The organisers' contact channels. NEXT_PUBLIC_* values are inlined at build time,
// so they must be present when the app is built (see .env.example).

import type { Language } from "./language";

const callLabel: Record<Language, (number: string) => string> = {
  th: (number) => `โทร ${number}`,
  en: (number) => `Call ${number}`,
};

export type ContactChannel = { kind: "line" | "phone"; label: string; href: string };

/** The channels that are set, labelled in `language` ("โทร …" / "Call …"; LINE reads the same in both). */
export function contactChannels(language: Language): ContactChannel[] {
  const channels: ContactChannel[] = [];

  const lineId = process.env.NEXT_PUBLIC_CONTACT_LINE?.trim();
  if (lineId) {
    const href = /^https?:\/\//.test(lineId)
      ? lineId
      : `https://line.me/R/ti/p/${encodeURIComponent(lineId.startsWith("@") ? lineId : `@${lineId}`)}`;
    channels.push({ kind: "line", label: `LINE ${lineId}`, href });
  }

  const phoneNumber = process.env.NEXT_PUBLIC_CONTACT_PHONE?.trim();
  if (phoneNumber) {
    channels.push({
      kind: "phone",
      label: callLabel[language](phoneNumber),
      href: `tel:${phoneNumber.replace(/[^\d+]/g, "")}`,
    });
  }

  return channels;
}
