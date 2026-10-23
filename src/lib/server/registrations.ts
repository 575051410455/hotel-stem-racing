import { after } from "next/server";
import { createTurnstileBotCheck } from "@/lib/bot-check/turnstile";
import { createDatabase } from "@/lib/db/client";
import { createSmtpEmailSender } from "@/lib/email/smtp-sender";
import { passLink } from "@/lib/registrations/event-pass-codec";
import { createRegistrations, type Registrations } from "@/lib/registrations/registrations";

// Composition root: the one place that turns environment variables into real collaborators.
// Everything is built on first use, never at import: the Docker build has no runtime secrets.

const globalForRegistrations = globalThis as unknown as {
  registrations?: Registrations;
};

export function registrations(): Registrations {
  if (!globalForRegistrations.registrations) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    const { db } = createDatabase(url);
    globalForRegistrations.registrations = createRegistrations({
      db,
      // The no-op unconfiguredEmailSender when SMTP_USER is empty. Built once: one SMTP pool.
      emailSender: createSmtpEmailSender(process.env),
      appUrl: process.env.APP_URL,
      // Event Pass emails go out once the response (the redirect to the pass) has been sent.
      afterResponse: (task) => after(task),
      // Turnstile siteverify when TURNSTILE_SECRET_KEY is set, otherwise passThroughBotCheck.
      botCheck: createTurnstileBotCheck(process.env),
    });
  }
  return globalForRegistrations.registrations;
}

/** The Event Pass link for a token, on the configured domain (APP_URL). Call at render time. */
export function eventPassLink(token: string): string {
  return passLink(token, process.env.APP_URL);
}
