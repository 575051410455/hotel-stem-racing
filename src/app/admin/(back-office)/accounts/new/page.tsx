import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { requireAdmin } from "@/lib/auth/session";
import { PageContent, PageHeader } from "../../_shell/page-header";
import { NewAccountForm } from "./new-account-form";

export const metadata: Metadata = { title: "New Account" };

// /admin/accounts/new: an Admin creates an Account of any kind (account-management ticket 06).
// Admin-only, like the Accounts list: Staff go to the check-in desk and a Kiosk to the Kiosk. The
// header is the static shell; the form waits for the session, so only an Admin ever sees it.
export default function NewAccountPage() {
  return (
    <>
      <PageHeader>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/admin/accounts">Accounts</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <h1 aria-current="page" className="font-normal text-foreground">
                New Account
              </h1>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </PageHeader>
      <PageContent narrow>
        <Suspense
          fallback={
            <p role="status" className="text-sm leading-normal text-muted-foreground">
              Loading…
            </p>
          }
        >
          <AdminOnlyNewAccountForm />
        </Suspense>
      </PageContent>
    </>
  );
}

async function AdminOnlyNewAccountForm() {
  await requireAdmin();
  return <NewAccountForm />;
}
