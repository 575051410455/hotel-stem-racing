import { after } from "next/server";
import { createDatabase } from "@/lib/db/client";
import { createSmtpEmailSender } from "@/lib/email/smtp-sender";
import { createRegistrations, type Registrations } from "@/lib/registrations/registrations";

// Composition root: the one place that turns environment variables into real collaborators.
// Everything is built on first use, never at import: the Docker build has no runtime secrets.
// Ticket 08 plugs the Turnstile verifier in here.

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
    });
  }
  return globalForRegistrations.registrations;
}
