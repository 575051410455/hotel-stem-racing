// The Account History's table (`account_changes`, account-management ticket 04): writing one Account
// Change, and reading them newest first. The Accounts module records its own changes through
// `recordAccountChange`, and so does the owner's change-password hook in staff-auth.ts; nothing
// else writes the table. Runs in the commands too, so it imports nothing that uses `server-only`.

import { count, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Database } from "@/lib/db/client";
import { users } from "@/lib/db/auth-schema";
import { accountChanges } from "@/lib/db/schema";
import type { AccountChange, Actor } from "./account-changes";

/** Changes per page of the Account History. */
export const ACCOUNT_HISTORY_PAGE_SIZE = 50;

/** One Account Change as the Account History shows it. */
export type AccountHistoryEntry = {
  id: number;
  changedAt: Date;
  /** The Account that changed, with its name and email as they are now. */
  account: { id: string; name: string; email: string };
  change: AccountChange;
  /** Who made it: an Account, with its name as it is now, or the server command. */
  actor: { accountId: string; name: string } | "server-command";
};

export type AccountHistoryPage = {
  /** Newest first. Empty past the last page. */
  changes: AccountHistoryEntry[];
  /** How many changes there are in all (for one Account, when asked for one). */
  total: number;
  /** 1-based, as read: anything below 1, or not a whole number, reads as 1. */
  page: number;
  pageSize: number;
};

/**
 * Only the fields each action has, copied one by one, so whatever else a caller's object carries
 * (a password, say) is never stored.
 */
function detailsOf(change: AccountChange) {
  switch (change.action) {
    case "created":
      return { kind: change.details.kind };
    case "name-changed":
    case "email-changed":
    case "kind-changed":
      return { from: change.details.from, to: change.details.to };
    default:
      return null;
  }
}

/**
 * Records one Account Change, right after the change itself. There's no transaction around the two
 * (Better Auth's internal adapter has none), so a failure here surfaces as an error to whoever made
 * the change.
 */
export async function recordAccountChange(
  db: Database,
  accountId: string,
  change: AccountChange,
  actor: Actor,
): Promise<void> {
  await db.insert(accountChanges).values({
    accountId,
    actorAccountId: actor === "server-command" ? null : actor.accountId,
    action: change.action,
    details: detailsOf(change),
  });
}

/** Back from the table: each action with the details it was written with. */
function toAccountChange(action: AccountChange["action"], details: unknown): AccountChange {
  return (details === null ? { action } : { action, details }) as AccountChange;
}

/** A page of Account Changes, newest first: everyone's, or one Account's (`accountId`). */
export async function readAccountHistory(
  db: Database,
  { accountId, page }: { accountId?: string; page: number },
): Promise<AccountHistoryPage> {
  const pageNumber = Number.isSafeInteger(page) && page > 1 ? page : 1;
  const filter = accountId === undefined ? undefined : eq(accountChanges.accountId, accountId);
  const actors = alias(users, "actors");

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: accountChanges.id,
        changedAt: accountChanges.changedAt,
        action: accountChanges.action,
        details: accountChanges.details,
        accountId: users.id,
        accountName: users.name,
        accountEmail: users.email,
        actorAccountId: accountChanges.actorAccountId,
        actorName: actors.name,
      })
      .from(accountChanges)
      .innerJoin(users, eq(users.id, accountChanges.accountId))
      .leftJoin(actors, eq(actors.id, accountChanges.actorAccountId))
      .where(filter)
      // Changes written in the same instant keep the order they were written in.
      .orderBy(desc(accountChanges.changedAt), desc(accountChanges.id))
      .limit(ACCOUNT_HISTORY_PAGE_SIZE)
      .offset((pageNumber - 1) * ACCOUNT_HISTORY_PAGE_SIZE),
    db.select({ total: count() }).from(accountChanges).where(filter),
  ]);

  return {
    changes: rows.map((row) => ({
      id: row.id,
      changedAt: row.changedAt,
      account: { id: row.accountId, name: row.accountName, email: row.accountEmail },
      change: toAccountChange(row.action, row.details),
      actor:
        row.actorAccountId === null
          ? "server-command"
          : // The reference keeps the actor's Account, so its name is always there.
            { accountId: row.actorAccountId, name: row.actorName ?? "" },
    })),
    total,
    page: pageNumber,
    pageSize: ACCOUNT_HISTORY_PAGE_SIZE,
  };
}
