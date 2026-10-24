import { Fragment } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Account } from "@/lib/auth/accounts";
import { createdLabel, KIND_LABELS, lastSignInLabel, statusLabels } from "./format";

/**
 * Every Account, read-only, in the order given (the Accounts module's: enabled first, then by name).
 * A table where the list has room, a stacked list where it hasn't (a phone, a tablet, or a narrow
 * window with the sidebar open). It switches on its own width (a container query, 56rem), not the
 * screen's: below that, six columns no longer fit side by side.
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
                  <span className="block min-w-32 wrap-anywhere">{account.name}</span>
                </TableCell>
                <TableCell className="whitespace-normal wrap-anywhere">{account.email}</TableCell>
                <TableCell>{KIND_LABELS[account.kind]}</TableCell>
                <TableCell className="whitespace-normal">
                  <Status account={account} />
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
          <li key={account.id} className="p-4">
            <p className="leading-normal font-medium wrap-anywhere">{account.name}</p>
            <p className="text-sm leading-normal wrap-anywhere text-muted-foreground">{account.email}</p>
            <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm leading-normal">
              <dt className="text-muted-foreground">Kind</dt>
              <dd>{KIND_LABELS[account.kind]}</dd>
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <Status account={account} />
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

/** "Enabled · Must change password", wrapping only between the two. */
function Status({ account }: { account: Account }) {
  return statusLabels(account).map((label, index) => (
    <Fragment key={label}>
      {index > 0 && " · "}
      <span className="whitespace-nowrap">{label}</span>
    </Fragment>
  ));
}

function LastSignIn({ at }: { at: Date | null }) {
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
