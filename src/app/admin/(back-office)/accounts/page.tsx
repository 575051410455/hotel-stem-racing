import { HistoryIcon, UserRoundPlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { accounts } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/auth/session";
import { PageContent, PageHeader, PageTitle } from "../_shell/page-header";
import { AccountList } from "./account-list";
import { accountHistoryHref } from "./history/links";

export const metadata: Metadata = { title: "Accounts" };

// /admin/accounts: every Account (account-management ticket 03), with the way to the Account History
// (04) and to create one (06). Admin-only: managing Accounts is (canManageAccounts, ADR 0004), so
// Staff go to the check-in desk and a Kiosk to the Kiosk. The header is the static shell; the list
// needs the session and the database.
export default function AccountsPage() {
  return (
    <>
      <PageHeader>
        <PageTitle>Accounts</PageTitle>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={accountHistoryHref()}>
              <HistoryIcon />
              {/* Only the icon on a phone, so "Accounts" and both buttons fit the header. */}
              <span className="max-sm:sr-only">History</span>
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/admin/accounts/new">
              <UserRoundPlusIcon />
              New Account
            </Link>
          </Button>
        </div>
      </PageHeader>
      <PageContent>
        <Suspense
          fallback={
            <p role="status" className="text-sm leading-normal text-muted-foreground">
              Loading Accounts…
            </p>
          }
        >
          <AdminOnlyAccountList />
        </Suspense>
      </PageContent>
    </>
  );
}

async function AdminOnlyAccountList() {
  await requireAdmin();
  return <AccountList accounts={await accounts().list()} />;
}
