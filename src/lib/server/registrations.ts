import { createDatabase } from "@/lib/db/client";
import { createRegistrations, type Registrations } from "@/lib/registrations/registrations";

// Composition root: the one place that turns environment variables into real collaborators.
// Later tickets plug the SMTP sender (05/10) and Turnstile verifier (08) in here.

const globalForRegistrations = globalThis as unknown as {
  registrations?: Registrations;
};

export function registrations(): Registrations {
  if (!globalForRegistrations.registrations) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    const { db } = createDatabase(url);
    globalForRegistrations.registrations = createRegistrations({ db });
  }
  return globalForRegistrations.registrations;
}
