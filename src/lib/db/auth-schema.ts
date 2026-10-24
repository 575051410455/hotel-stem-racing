import { relations, sql } from "drizzle-orm";
import { boolean, check, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
// Relative, not "@/…", so drizzle-kit needs no path aliases to load this file.
import { ACCOUNT_KINDS } from "../auth/access";

// Better Auth's own tables for Staff sign-in (ticket 04). The shape follows
// `npx auth@1.7.12 generate --adapter drizzle --dialect postgresql`, with these changes:
// - plural table names (`usePlural: true` in src/lib/auth/staff-auth.ts)
// - column names left to the client's snake_case casing
// - timestamps with time zone, as in schema.ts
// Re-run the generator after upgrading Better Auth or adding a plugin, and port any new fields here.
//
// - `users.kind`, our own field (ticket 23), declared to Better Auth as a user `additionalFields`
//
// Vocabulary: a `users` row is an Account (GLOSSARY.md): an Admin, Staff or Kiosk Account, by its
// `kind`. An `accounts` row is Better Auth's sign-in method for it; Accounts only have the
// `credential` one, which holds the password hash.

export const users = pgTable(
  "users",
  {
    id: text().primaryKey(),
    /** The display name: the Staff member's name, or the Kiosk's, such as "Kiosk 1". */
    name: text().notNull(),
    email: text().notNull().unique(),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    /**
     * Admin, Staff or Kiosk Account (ADR 0003, ADR 0004); what each may do is in
     * src/lib/auth/access.ts. Set only by the Accounts module (`npm run staff`, `npm run seed`).
     * Better Auth refuses it from requests (`input: false`).
     */
    kind: text({ enum: ACCOUNT_KINDS }).notNull().default("staff"),
    // Part 2 of account-management (ticket 03). Like `kind`, declared to Better Auth as user
    // `additionalFields` with `input: false`, so no request can set them, and returned on the session.
    /** Set when someone else sets a Staff or Admin Account's password; its owner must choose their own. */
    mustChangePassword: boolean().notNull().default(false),
    /** When an Admin disabled the Account; null while it is enabled. Disabled Accounts can't sign in. */
    disabledAt: timestamp({ withTimezone: true }),
    /** When the Account last signed in (any kind), set as each session is created; null for "Never". */
    lastSignedInAt: timestamp({ withTimezone: true }),
  },
  (table) => [check("users_kind_check", sql`${table.kind} in ('admin', 'staff', 'kiosk')`)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text().primaryKey(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [index().on(table.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    /** Password hash (scrypt) for the `credential` provider. */
    password: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index().on(table.userId)],
);

export const verifications = pgTable(
  "verifications",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index().on(table.identifier)],
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));
