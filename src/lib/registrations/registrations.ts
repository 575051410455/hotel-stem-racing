import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { registrations as registrationsTable } from "@/lib/db/schema";
import { endedEventDayErrors, isRegistrationClosed } from "./event-day-availability";
import { generatePassCode } from "./event-pass-codec";
import {
  type AttendeeRole,
  type FieldErrors,
  parseRegistration,
  type ReferralSource,
  type RegistrationForm,
  type ValidRegistration,
} from "./fields";
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
  /** Source of new Pass Codes; tests pass a fixed sequence to exercise collisions. */
  generatePassCode?: () => string;
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

/**
 * The outcome of submitting a Registration, discriminated by `status`.
 * Later outcomes join as new members: `duplicate` (06), `closed` (07), `bot-check-failed` (08).
 */
export type SubmitResult =
  | { status: "accepted"; pass: EventPass }
  | { status: "invalid"; fieldErrors: FieldErrors }
  /** The last Event Day has ended (per the injected clock); checked before Field validation. */
  | { status: "closed" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A fresh Pass Code is drawn this many times before a collision is treated as a fault. */
const PASS_CODE_ATTEMPTS = 5;

// Compile-time guard: the form's options and the schema's enums must stay identical.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const optionsMatchSchema: Same<AttendeeRole, (typeof registrationsTable.role.enumValues)[number]> &
  Same<ReferralSource, (typeof registrationsTable.referralSources.enumValues)[number]> = true;
void optionsMatchSchema;

const eventPassColumns = {
  token: registrationsTable.token,
  passCode: registrationsTable.passCode,
  givenName: registrationsTable.givenName,
  familyName: registrationsTable.familyName,
  eventDays: registrationsTable.eventDays,
};

/**
 * Identifies a Duplicate Registration: given name + family name + E.164 phone, each trimmed,
 * whitespace-collapsed, NFC-normalised and lower-cased. Backed by a unique constraint.
 */
function duplicateKey({ givenName, familyName, phone }: ValidRegistration): string {
  const fold = (text: string) => text.trim().replace(/\s+/g, " ").normalize("NFC").toLowerCase();
  return [fold(givenName), fold(familyName), phone].join("\u001f");
}

/** True for a Postgres unique violation of `constraint`, also when wrapped by Drizzle. */
function isUniqueViolation(error: unknown, constraint: string): boolean {
  let current = error;
  while (typeof current === "object" && current !== null) {
    const { code, constraint_name, cause } = current as {
      code?: unknown;
      constraint_name?: unknown;
      cause?: unknown;
    };
    if (code === "23505") return constraint_name === constraint;
    current = cause;
  }
  return false;
}

export function createRegistrations(dependencies: RegistrationDependencies) {
  const deps = {
    clock: systemClock,
    emailSender: unconfiguredEmailSender,
    botCheck: passThroughBotCheck,
    generatePassCode,
    ...dependencies,
  };

  async function save(registration: ValidRegistration): Promise<EventPass> {
    const token = randomUUID();
    for (let attempt = 1; ; attempt++) {
      try {
        const [pass] = await deps.db
          .insert(registrationsTable)
          .values({
            ...registration,
            token,
            passCode: deps.generatePassCode(),
            duplicateKey: duplicateKey(registration),
          })
          .returning(eventPassColumns);
        return pass;
      } catch (error) {
        const retry =
          attempt < PASS_CODE_ATTEMPTS && isUniqueViolation(error, "registrations_passCode_unique");
        if (!retry) throw error;
      }
    }
  }

  return {
    /**
     * Submits a Registration from what the Attendee entered. The same Field validation the
     * browser runs is re-run here; nothing is saved unless every field is valid.
     */
    async submit(form: RegistrationForm): Promise<SubmitResult> {
      const now = deps.clock();
      if (isRegistrationClosed(now)) return { status: "closed" };

      const parsed = parseRegistration(form);
      const fieldErrors = {
        ...endedEventDayErrors(form.eventDays, now),
        ...(parsed.ok ? {} : parsed.fieldErrors),
      };
      if (!parsed.ok || Object.keys(fieldErrors).length > 0) return { status: "invalid", fieldErrors };

      return { status: "accepted", pass: await save(parsed.registration) };
    },

    async getEventPass(token: string): Promise<EventPassLookup> {
      if (!UUID_PATTERN.test(token)) return { status: "not-found" };

      const [row] = await deps.db
        .select(eventPassColumns)
        .from(registrationsTable)
        .where(eq(registrationsTable.token, token))
        .limit(1);

      return row ? { status: "found", pass: row } : { status: "not-found" };
    },
  };
}

export type Registrations = ReturnType<typeof createRegistrations>;
