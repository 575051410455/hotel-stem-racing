import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

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
    // Id of the signed-in Staff Account (Better Auth's user id; auth tables arrive in ticket 04).
    staffAccountId: text(),
    // The Attendee did not choose this Event Day when registering.
    outsideRegisteredDay: boolean().notNull().default(false),
  },
  (table) => [unique().on(table.registrationId, table.eventDay)],
);
