// The organisers' contact channels. NEXT_PUBLIC_* values are inlined at build time,
// so they must be present when the app is built (see .env.example).

export type ContactChannel = { kind: "line" | "phone"; label: string; href: string };

export function contactChannels(): ContactChannel[] {
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
      label: `โทร ${phoneNumber}`,
      href: `tel:${phoneNumber.replace(/[^\d+]/g, "")}`,
    });
  }

  return channels;
}
