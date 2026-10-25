import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
// Relative, not "@/…", so drizzle-kit needs no path aliases to load this file.
import { ACCOUNT_CHANGE_ACTIONS, type AccountChange } from "../auth/account-changes";
import { users } from "./auth-schema";

export const attendeeRole = pgEnum("attendee_role", [
  "parent",
  "teacher",
  "student",
  "sponsor",
  "other",
]);

export const referralSource = pgEnum("referral_source", [
  "facebook",
  "instagram",
  "tiktok",
  "line",
  "website",
  "school",
  "organisation",
  "friend",
  "competing_team",
  "other",
]);

export const registrations = pgTable(
  "registrations",
  {
    // Sequential so bulk email sends can page with an "after id" cursor.
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    // Goes into the Event Pass QR; never shown to people or used in file names.
    token: uuid().notNull().unique(),
    passCode: text().notNull().unique(),
    givenName: text().notNull(),
    familyName: text().notNull(),
    // E.164, e.g. +66812345678
    phone: text().notNull(),
    email: text().notNull(),
    // Normalised given name + family name + phone; see Duplicate Registration in GLOSSARY.md.
    duplicateKey: text().notNull().unique(),
    role: attendeeRole().notNull(),
    roleOther: text(),
    organisation: text(),
    eventDays: date({ mode: "string" }).array().notNull(),
    referralSources: referralSource().array().notNull(),
    referralOther: text(),
    competingTeamCheeredFor: text(),
    accessibilityNeeds: text(),
    comments: text(),
    emailSentCount: integer().notNull().default(0),
    lastEmailSentAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index().on(table.createdAt)],
);

export const checkIns = pgTable(
  "check_ins",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    registrationId: integer()
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    eventDay: date({ mode: "string" }).notNull(),
    checkedInAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    // Id of the signed-in Account that recorded it: a Staff Account, or a Kiosk Account (ticket 23).
    // Better Auth's user id (`users.id`); the name predates Kiosk Accounts.
    staffAccountId: text(),
    // The Attendee did not choose this Event Day when registering.
    outsideRegisteredDay: boolean().notNull().default(false),
  },
  (table) => [unique().on(table.registrationId, table.eventDay)],
);

/** What `account_changes.details` holds for each action; null for the actions that have none. */
type AccountChangeDetails = Extract<AccountChange, { details: unknown }>["details"];

/**
 * The Account History (account-management ticket 04): one row per Account Change, written by the
 * Accounts module and the owner's change-password hook (src/lib/auth/account-history.ts), never a
 * password or its hash. Rows are never edited or deleted, and neither are Accounts (ADR 0004), so
 * neither reference cascades.
 */
export const accountChanges = pgTable(
  "account_changes",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    /** The Account that changed. */
    accountId: text()
      .notNull()
      .references(() => users.id),
    /** The Account that made the change; null for the server command (`npm run staff`, `npm run seed`). */
    actorAccountId: text().references(() => users.id),
    action: text({ enum: ACCOUNT_CHANGE_ACTIONS }).notNull(),
    /** `{ kind }` for `created`, `{ from, to }` for the `*-changed` actions with values, else null. */
    details: jsonb().$type<AccountChangeDetails>(),
    changedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // One Account's history, and everyone's, each newest first.
    index().on(table.accountId, table.changedAt.desc()),
    index().on(table.changedAt.desc()),
    check(
      "account_changes_action_check",
      sql`${table.action} in (${sql.raw(ACCOUNT_CHANGE_ACTIONS.map((action) => `'${action}'`).join(", "))})`,
    ),
  ],
);
