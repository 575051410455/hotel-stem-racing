import type { Metadata } from "next";
import { Suspense } from "react";
import { accounts } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/auth/session";
import { PageContent, PageHeader, PageTitle } from "../_shell/page-header";
import { AccountList } from "./account-list";

export const metadata: Metadata = { title: "Accounts" };

// /admin/accounts: every Account, read-only (account-management ticket 03). Admin-only: managing
// Accounts is (canManageAccounts, ADR 0004), so Staff go to the check-in desk and a Kiosk to the
// Kiosk. The header is the static shell; the list needs the session and the database.
export default function AccountsPage() {
  return (
    <>
      <PageHeader>
        <PageTitle>Accounts</PageTitle>
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
