import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { registrations as registrationsTable } from "@/lib/db/schema";
import {
  ATTEMPTS_PER_WINDOW,
  createInMemoryRateLimiter,
  type SubmissionContext,
  type SubmissionRateLimiter,
} from "./bot-protection";
import { bulkSendSummary, type EventPassBatchRequest, sendEventPassBatch } from "./bulk-send";
import type { BulkSendMode } from "./bulk-send-params";
import { createCheckIn } from "./check-in";
import { headCounts } from "./counts";
import { deleteRegistration, getRegistrationDetail } from "./detail";
import { respondToDuplicate } from "./duplicates";
import { endedEventDayErrors, isRegistrationClosed } from "./event-day-availability";
import { generatePassCode } from "./event-pass-codec";
import { exportRegistrations, type RegistrationExportFilters } from "./export";
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
import { createResendEventPass } from "./resend-event-pass";
import { searchRegistrations } from "./search";
import type { RegistrationSearch } from "./search-params";
import { sendEventPassEmail } from "./send-event-pass";

export type RegistrationDependencies = {
  db: Database;
  clock?: Clock;
  emailSender?: EventPassEmailSender;
  botCheck?: BotCheckVerifier;
  /** Source of new Pass Codes; tests pass a fixed sequence to exercise collisions. */
  generatePassCode?: () => string;
  /** Base of Event Pass links in emails (APP_URL). Without it, sending an Event Pass email fails (recorded, never thrown). */
  appUrl?: string;
  /**
   * Runs work that must not hold up the Attendee's response, such as the Event Pass email.
   * The app passes Next's `after()`. The default runs the task before `submit` resolves, so
   * callers without a response to protect (and tests) see its effect straight away.
   */
  afterResponse?: (task: () => Promise<unknown>) => void | Promise<void>;
  /** Per-IP submission limit; defaults to SUBMISSIONS_PER_WINDOW (60) per 10 minutes, in memory. */
  rateLimiter?: SubmissionRateLimiter;
  /** Per-IP cap on every attempt before the bot check; defaults to ATTEMPTS_PER_WINDOW. */
  attemptLimiter?: SubmissionRateLimiter;
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
 * Later outcomes join as new members: `duplicate` (06), `closed` (07), `bot-check-failed` and
 * `rate-limited` (08). Order of checks: closed, bot check, rate limit, Field validation, save.
 */
export type SubmitResult =
  | { status: "accepted"; pass: EventPass }
  | { status: "invalid"; fieldErrors: FieldErrors }
  /**
   * The same person is already registered (Duplicate Registration). Never carries the token,
   * the Pass Code or a link: `maskedEmail` is the registered email, masked (j***@gmail.com).
   * `emailConfigured` is false when SMTP is off, so the form shows the contact channels instead.
   */
  | { status: "duplicate"; maskedEmail: string; passResent: boolean; emailConfigured: boolean }
  /** The last Event Day has ended (per the injected clock); checked before Field validation. */
  | { status: "closed" }
  /** The Turnstile token was missing, invalid or already spent, or siteverify was unreachable. */
  | { status: "bot-check-failed" }
  /** Too many submissions from this IP recently; the form was not looked at, nothing saved. */
  | { status: "rate-limited" };

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
    afterResponse: async (task: () => Promise<unknown>) => {
      await task();
    },
    ...dependencies,
  };
  const rateLimiter = dependencies.rateLimiter ?? createInMemoryRateLimiter();
  const attemptLimiter =
    dependencies.attemptLimiter ?? createInMemoryRateLimiter({ limit: ATTEMPTS_PER_WINDOW });

  /** Saves a new Registration, or resolves to undefined when it is a Duplicate Registration. */
  async function save(registration: ValidRegistration): Promise<EventPass | undefined> {
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
        if (isUniqueViolation(error, "registrations_duplicateKey_unique")) return undefined;
        const retry =
          attempt < PASS_CODE_ATTEMPTS && isUniqueViolation(error, "registrations_passCode_unique");
        if (!retry) throw error;
      }
    }
  }

  return {
    /** Checks an Attendee in from scanned or typed text; see `check-in.ts` for the outcomes. */
    checkIn: createCheckIn(deps),

    /**
     * Submits a Registration from what the Attendee entered. The same Field validation the
     * browser runs is re-run here; nothing is saved unless every field is valid.
     */
    async submit(form: RegistrationForm, context: SubmissionContext = {}): Promise<SubmitResult> {
      const now = deps.clock();
      if (isRegistrationClosed(now)) return { status: "closed" };

      // A loose cap on every attempt, verified or not, so junk tokens can't make unbounded
      // siteverify calls. Then the bot check before the tighter rate limit, so only verified
      // submissions use up an IP's allowance: bots on a shared IP (venue Wi-Fi, carrier NAT)
      // can't lock real Attendees out.
      if (context.remoteIp !== undefined && !attemptLimiter.tryAcquire(context.remoteIp, now)) {
        return { status: "rate-limited" };
      }
      if (!(await deps.botCheck.verify(context.botCheckToken, context.remoteIp))) {
        return { status: "bot-check-failed" };
      }
      if (context.remoteIp !== undefined && !rateLimiter.tryAcquire(context.remoteIp, now)) {
        return { status: "rate-limited" };
      }

      const parsed = parseRegistration(form);
      const fieldErrors = {
        ...endedEventDayErrors(form.eventDays, now),
        ...(parsed.ok ? {} : parsed.fieldErrors),
      };
      if (!parsed.ok || Object.keys(fieldErrors).length > 0) return { status: "invalid", fieldErrors };

      const pass = await save(parsed.registration);
      if (!pass) return respondToDuplicate(deps, duplicateKey(parsed.registration));

      // Never fails the Registration: sendEventPassEmail catches and logs everything.
      await deps.afterResponse(() =>
        sendEventPassEmail(deps, { ...pass, email: parsed.registration.email }),
      );
      return { status: "accepted", pass };
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

    /** Everything about one Registration (by id), with its Check-Ins; see ./detail.ts. */
    getRegistrationDetail: (id: number) => getRegistrationDetail(deps.db, id),

    /** Deletes one Registration (by id) and its Check-Ins: spam or a Duplicate Registration. */
    deleteRegistration: (id: number) => deleteRegistration(deps.db, id),

    /** The overview's head counts: per Event Day (by Attendee Role, Check-Ins), all and today's (see counts.ts). */
    headCounts: () => headCounts(deps),

    /** Every Registration matching the list's search, filters and sort, unpaged; see ./export.ts. */
    exportRows: (filters: RegistrationExportFilters) => exportRegistrations(deps.db, filters),

    /** One page of the Back Office Registration list; see ./search.ts. */
    search: (search: RegistrationSearch) => searchRegistrations(deps.db, search),

    /** Staff email one Registration (by id) its Event Pass again; see ./resend-event-pass.ts. */
    resendEventPass: createResendEventPass(deps),

    /** How many Event Pass emails a bulk send would send, per Event Day; see ./bulk-send.ts. */
    bulkSendSummary: (mode: BulkSendMode) => bulkSendSummary(deps, mode),

    /** Sends the next batch of a bulk send and returns its results and cursor; see ./bulk-send.ts. */
    sendEventPassBatch: (request: EventPassBatchRequest) => sendEventPassBatch(deps, request),
  };
}

export type Registrations = ReturnType<typeof createRegistrations>;
