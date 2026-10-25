import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { accountChangeLine } from "@/lib/auth/account-changes";
import type { AccountHistoryEntry } from "@/lib/auth/account-history";
import { bangkokEnglishDateTime } from "@/lib/bangkok-time";
import { cn } from "@/lib/utils";
import { accountHref } from "../links";

/**
 * Account Changes in the order given (newest first), read-only; each Account's name opens its page.
 * A table where the list has room, a stacked list where it hasn't (a phone, a tablet, or a narrow
 * window with the sidebar open): it switches on its own width (a container query, 48rem), like the
 * Accounts list.
 */
export function AccountHistoryList({ changes }: { changes: AccountHistoryEntry[] }) {
  return (
    <div className="@container/history">
      <div className="hidden overflow-hidden rounded-lg border bg-background @3xl/history:block">
        <Table aria-label="Account History">
          <TableHeader className="bg-muted">
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">When</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Change</TableHead>
              <TableHead className="pr-4">By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {changes.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="pl-4 align-top">
                  <When at={entry.changedAt} />
                </TableCell>
                {/* Long names, emails and changes wrap rather than push the last column out of view. */}
                <TableCell className="align-top whitespace-normal">
                  <AccountLink account={entry.account} className="block min-w-32 font-medium wrap-anywhere" />
                  <span className="block wrap-anywhere text-muted-foreground">{entry.account.email}</span>
                </TableCell>
                <TableCell className="align-top whitespace-normal wrap-anywhere">
                  {accountChangeLine(entry.change)}
                </TableCell>
                <TableCell className="pr-4 align-top whitespace-normal">
                  <span className="block min-w-24 wrap-anywhere">
                    <By actor={entry.actor} />
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul aria-label="Account History" className="divide-y rounded-lg border bg-background @3xl/history:hidden">
        {changes.map((entry) => (
          <li key={entry.id} className="p-4">
            <p className="leading-normal font-medium wrap-anywhere">{accountChangeLine(entry.change)}</p>
            <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm leading-normal">
              <dt className="text-muted-foreground">Account</dt>
              <dd className="wrap-anywhere">
                <AccountLink account={entry.account} />
                <span className="block text-muted-foreground">{entry.account.email}</span>
              </dd>
              <dt className="text-muted-foreground">When</dt>
              <dd>
                <When at={entry.changedAt} />
              </dd>
              <dt className="text-muted-foreground">By</dt>
              <dd className="wrap-anywhere">
                <By actor={entry.actor} />
              </dd>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The Account's name as it is now, opening its page. */
function AccountLink({ account, className }: { account: AccountHistoryEntry["account"]; className?: string }) {
  return (
    <Link href={accountHref(account.id)} className={cn("underline underline-offset-4", className)}>
      {account.name}
    </Link>
  );
}

/** "24 Oct 2026, 21:06" in Bangkok time. */
function When({ at }: { at: Date }) {
  return (
    <time dateTime={at.toISOString()} className="whitespace-nowrap tabular-nums">
      {bangkokEnglishDateTime(at)}
    </time>
  );
}

/** The Account's name as it is now, or "Server command". */
function By({ actor }: { actor: AccountHistoryEntry["actor"] }) {
  return actor === "server-command" ? <span className="text-muted-foreground">Server command</span> : actor.name;
}
