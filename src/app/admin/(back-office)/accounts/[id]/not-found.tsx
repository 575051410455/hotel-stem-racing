import Link from "next/link";
import { PageContent } from "../../_shell/page-header";
import { AccountHeader } from "./account-header";

// An Account's page for an id no Account has (`notFound()` in page.tsx). Here rather than the global
// 404, so the Admin stays inside the Back Office, with the sidebar and a way back to the list.
// Accounts are never deleted, so only a wrong or mistyped link lands here.
export default function AccountNotFound() {
  return (
    <>
      <AccountHeader name={null} />
      <PageContent narrow>
        <h1 className="text-2xl leading-normal font-semibold">Account not found</h1>
        <p className="mt-2 leading-normal text-muted-foreground">
          There&apos;s no Account with this id. The link may be wrong.{" "}
          <Link href="/admin/accounts" className="font-medium whitespace-nowrap text-foreground underline underline-offset-4">
            Back to Accounts
          </Link>
        </p>
      </PageContent>
    </>
  );
}
