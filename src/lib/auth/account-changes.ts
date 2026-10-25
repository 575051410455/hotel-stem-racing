// What an Account Change is (GLOSSARY: Account Change), who makes one, and its English line in the
// Account History. Pure; safe in browser and server. Relative imports only: the database schema
// loads it through drizzle-kit.

import type { AccountKind } from "./access";
import { KIND_LABELS } from "./kind-labels";

/**
 * Who makes an Account Change: an Account (an Admin in the Back Office, or the owner on My Account),
 * or the server command (`npm run staff`, `npm run seed`), which has no Account. Every write
 * operation of the Accounts module takes one.
 */
export type Actor = { accountId: string } | "server-command";

/** Every kind of Account Change, as `account_changes.action` stores it. */
export const ACCOUNT_CHANGE_ACTIONS = [
  "created",
  "name-changed",
  "email-changed",
  "kind-changed",
  "password-set",
  "password-changed",
  "disabled",
  "enabled",
] as const;

/**
 * One change to an Account, as `account_changes.action` and `.details` hold it. Never a password or
 * its hash: no variant has room for one. `password-set` is by someone else (an Admin or the server
 * command); `password-changed` is by the owner.
 */
export type AccountChange =
  | { action: "created"; details: { kind: AccountKind } }
  | { action: "name-changed"; details: { from: string; to: string } }
  | { action: "email-changed"; details: { from: string; to: string } }
  | { action: "kind-changed"; details: { from: AccountKind; to: AccountKind } }
  | { action: "password-set" }
  | { action: "password-changed" }
  | { action: "disabled" }
  | { action: "enabled" };

/** The Account History's English line for one change: "Created as Kiosk", "Kind changed: Staff → Admin". */
export function accountChangeLine(change: AccountChange): string {
  switch (change.action) {
    case "created":
      return `Created as ${KIND_LABELS[change.details.kind]}`;
    case "name-changed":
      return `Name changed: ${change.details.from} → ${change.details.to}`;
    case "email-changed":
      return `Email changed: ${change.details.from} → ${change.details.to}`;
    case "kind-changed":
      return `Kind changed: ${KIND_LABELS[change.details.from]} → ${KIND_LABELS[change.details.to]}`;
    case "password-set":
      return "Password set";
    case "password-changed":
      return "Password changed by owner";
    case "disabled":
      return "Disabled";
    case "enabled":
      return "Enabled";
  }
}
