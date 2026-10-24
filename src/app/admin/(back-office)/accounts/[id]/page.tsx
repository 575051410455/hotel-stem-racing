import { HistoryIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { MY_ACCOUNT_PATH } from "@/lib/auth/access";
import { KIND_LABELS } from "@/lib/auth/kind-labels";
import { accounts } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/auth/session";
import { PageContent } from "../../_shell/page-header";
import { AccountStatus, LastSignIn } from "../account-list";
import { accountHistoryHref } from "../history/links";
import { AccountDetailsForm } from "./account-details-form";
import { AccountHeader } from "./account-header";
import { SetPasswordForm } from "./set-password-form";

export const metadata: Metadata = { title: "Account" };

// /admin/accounts/{id}: one Account (account-management ticket 07), reached from its row on the
// Accounts list or from the Account History. An Admin changes its name, email and kind, sets a new
// password, and goes on to its history. On the Admin's own Account the kind is locked and the
// password is changed on My Account instead. Admin-only, like the list. The id, the session and the
// Account are request-time, so it all renders behind one boundary, header included. An unknown id
// is not found (not-found.tsx, inside the Back Office).
export default function AccountPage({ params }: PageProps<"/admin/accounts/[id]">) {
  return (
    <Suspense
      fallback={
        <>
          <AccountHeader name={null} />
          <PageContent narrow>
            <p role="status" className="text-sm leading-normal text-muted-foreground">
              Loading the Account…
            </p>
          </PageContent>
        </>
      }
    >
      <AdminOnlyAccount params={params} />
    </Suspense>
  );
}

async function AdminOnlyAccount({ params }: Pick<PageProps<"/admin/accounts/[id]">, "params">) {
  const admin = await requireAdmin();
  const { id } = await params;
  const account = await accounts().get(id);
  if (!account) notFound();
  const isOwnAccount = account.id === admin.id;

  return (
    <>
      <AccountHeader name={account.name} />
      <PageContent narrow>
        <h1 className="text-2xl leading-normal font-semibold wrap-anywhere">{account.name}</h1>
        <p className="mt-1 text-sm leading-normal wrap-anywhere text-muted-foreground">{account.email}</p>
        <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm leading-normal">
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
        </dl>
        <div className="mt-4">
          <Button asChild variant="outline" size="sm">
            <Link href={accountHistoryHref({ accountId: account.id })}>
              <HistoryIcon />
              View history
            </Link>
          </Button>
        </div>

        <section aria-labelledby="account-details-heading" className="mt-10 border-t pt-6">
          <h2 id="account-details-heading" className="text-base leading-normal font-semibold">
            Details
          </h2>
          <div className="mt-4">
            {/* Starts again from the saved values whenever they change: after a save, or someone else's. */}
            <AccountDetailsForm
              key={JSON.stringify([account.name, account.email, account.kind])}
              account={{ id: account.id, name: account.name, email: account.email, kind: account.kind }}
              isOwnAccount={isOwnAccount}
            />
          </div>
        </section>

        <section aria-labelledby="set-password-heading" className="mt-10 border-t pt-6">
          <h2 id="set-password-heading" className="text-base leading-normal font-semibold">
            {isOwnAccount ? "Password" : "Set a new password"}
          </h2>
          <div className="mt-4">
            {isOwnAccount ? (
              // Changed by its owner, by entering the current one: no one else ever chooses it.
              <p className="text-sm leading-normal">
                You change your own password on{" "}
                <Link href={MY_ACCOUNT_PATH} className="font-medium underline underline-offset-4">
                  My Account
                </Link>
                , by entering your current one.
              </p>
            ) : (
              <SetPasswordForm accountId={account.id} kind={account.kind} />
            )}
          </div>
        </section>
      </PageContent>
    </>
  );
}
