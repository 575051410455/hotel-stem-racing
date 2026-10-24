import Link from "next/link";
import { Fragment } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Account } from "@/lib/auth/accounts";
import { KIND_LABELS } from "@/lib/auth/kind-labels";
import { createdLabel, lastSignInLabel, statusLabels } from "./format";
import { accountHref } from "./links";

/**
 * Every Account, in the order given (the Accounts module's: enabled first, then by name), each
 * opening its page from its name. A table where the list has room, a stacked list where it hasn't
 * (a phone, a tablet, or a narrow window with the sidebar open), where the whole row opens it. It
 * switches on its own width (a container query, 56rem), not the screen's: below that, six columns
 * no longer fit side by side.
 */
export function AccountList({ accounts }: { accounts: Account[] }) {
  return (
    <div className="@container/accounts">
      <div className="hidden overflow-hidden rounded-lg border bg-background @4xl/accounts:block">
        <Table aria-label="Accounts">
          <TableHeader className="bg-muted">
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last sign-in</TableHead>
              <TableHead className="pr-4">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id}>
                {/* A long name or email wraps rather than push the last columns out of view. The name
                    keeps a floor width, so it breaks between words, not inside them. */}
                <TableCell className="pl-4 font-medium whitespace-normal">
                  <Link
                    href={accountHref(account.id)}
                    className="block min-w-32 wrap-anywhere underline-offset-4 hover:underline"
                  >
                    {account.name}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-normal wrap-anywhere">{account.email}</TableCell>
                <TableCell>{KIND_LABELS[account.kind]}</TableCell>
                <TableCell className="whitespace-normal">
                  <AccountStatus account={account} />
                </TableCell>
                <TableCell>
                  <LastSignIn at={account.lastSignedInAt} />
                </TableCell>
                <TableCell className="pr-4">
                  <Created at={account.createdAt} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul aria-label="Accounts" className="divide-y rounded-lg border bg-background @4xl/accounts:hidden">
        {accounts.map((account) => (
          <li key={account.id} className="relative p-4 hover:bg-muted/50 has-focus-visible:bg-muted/50">
            {/* Stretched over the row, so a tap anywhere on it opens the Account. */}
            <Link
              href={accountHref(account.id)}
              className="block leading-normal font-medium wrap-anywhere outline-none after:absolute after:inset-0 focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50"
            >
              {account.name}
            </Link>
            <p className="text-sm leading-normal wrap-anywhere text-muted-foreground">{account.email}</p>
            <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm leading-normal">
              <dt className="text-muted-foreground">Kind</dt>
              <dd>{KIND_LABELS[account.kind]}</dd>
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <AccountStatus account={account} />
              </dd>
              <dt className="text-muted-foreground">Last sign-in</dt>
              <dd>
                <LastSignIn at={account.lastSignedInAt} />
              </dd>
              <dt className="text-muted-foreground">Created</dt>
              <dd>
                <Created at={account.createdAt} />
              </dd>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** "Enabled · Must change password", wrapping only between the two. Also on the Account's page. */
export function AccountStatus({ account }: { account: Account }) {
  return statusLabels(account).map((label, index) => (
    <Fragment key={label}>
      {index > 0 && " · "}
      <span className="whitespace-nowrap">{label}</span>
    </Fragment>
  ));
}

/** "22 Oct 2026, 14:05" in Bangkok time, or "Never". Also on the Account's page. */
export function LastSignIn({ at }: { at: Date | null }) {
  if (!at) return <>{lastSignInLabel(null)}</>;
  return (
    <time dateTime={at.toISOString()} className="tabular-nums">
      {lastSignInLabel(at)}
    </time>
  );
}

function Created({ at }: { at: Date }) {
  return (
    <time dateTime={at.toISOString()} className="tabular-nums">
      {createdLabel(at)}
    </time>
  );
}
