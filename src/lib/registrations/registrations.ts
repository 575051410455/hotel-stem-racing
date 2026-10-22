import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { registrations as registrationsTable } from "@/lib/db/schema";
import {
  type BotCheckVerifier,
  type Clock,
  type EventPassEmailSender,
  passThroughBotCheck,
  systemClock,
  unconfiguredEmailSender,
} from "./ports";

export type RegistrationDependencies = {
  db: Database;
  clock?: Clock;
  emailSender?: EventPassEmailSender;
  botCheck?: BotCheckVerifier;
};

export type EventPass = {
  token: string;
  passCode: string;
  givenName: string;
  familyName: string;
  /** ISO dates of the chosen Event Days. */
  eventDays: string[];
};

export type EventPassLookup = { status: "found"; pass: EventPass } | { status: "not-found" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createRegistrations(dependencies: RegistrationDependencies) {
  const deps = {
    clock: systemClock,
    emailSender: unconfiguredEmailSender,
    botCheck: passThroughBotCheck,
    ...dependencies,
  };

  return {
    async getEventPass(token: string): Promise<EventPassLookup> {
      if (!UUID_PATTERN.test(token)) return { status: "not-found" };

      const [row] = await deps.db
        .select({
          token: registrationsTable.token,
          passCode: registrationsTable.passCode,
          givenName: registrationsTable.givenName,
          familyName: registrationsTable.familyName,
          eventDays: registrationsTable.eventDays,
        })
        .from(registrationsTable)
        .where(eq(registrationsTable.token, token))
        .limit(1);

      return row ? { status: "found", pass: row } : { status: "not-found" };
    },
  };
}

export type Registrations = ReturnType<typeof createRegistrations>;
