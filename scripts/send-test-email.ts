// Operator command: sends a sample Event Pass email so SMTP can be checked before launch.
//
//   npm run email:test -- someone@example.com
//
// Reads SMTP_*, EMAIL_FROM and APP_URL from the environment (and .env when present). The sample
// link points at a random token, so it opens the "not found" page rather than a real Event Pass.

import { randomUUID } from "node:crypto";
import { createSmtpEmailSender } from "../src/lib/email/smtp-sender";
import { event } from "../src/lib/event";
import { passLink } from "../src/lib/registrations/event-pass-codec";

async function main(): Promise<number> {
  const to = process.argv[2]?.trim();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    console.error("Usage: npm run email:test -- <email address>");
    return 2;
  }

  const appUrl = process.env.APP_URL?.trim();
  if (!appUrl) {
    console.error("APP_URL is not set, so there is no domain to build the Event Pass link from.");
    return 1;
  }

  const sender = createSmtpEmailSender(process.env);
  if (!sender.configured) {
    console.error("SMTP is not configured: set SMTP_USER, SMTP_PASS and EMAIL_FROM in .env.");
    return 1;
  }

  const token = randomUUID();
  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  console.log(`Sending a sample Event Pass email to ${to} through ${host}...`);

  const result = await sender.send({
    to,
    passLink: passLink(token, appUrl),
    pass: {
      token,
      passCode: "EP-TEST2345",
      givenName: "ทดสอบ",
      familyName: "ส่งอีเมล",
      eventDays: event.eventDays.map((day) => day.date),
    },
  });

  if (result.success) {
    console.log(`Sent. Check the inbox of ${to} (and the From address it shows).`);
    return 0;
  }
  console.error(`Not sent: ${result.error}`);
  return 1;
}

// Exit explicitly: the pooled SMTP transport keeps idle connections open.
main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
