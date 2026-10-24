import type { Metadata } from "next";
import { Suspense } from "react";
import type { AccountKind } from "@/lib/auth/access";
import { requireStaff } from "@/lib/auth/session";
import { PageContent, PageHeader, PageTitle } from "../_shell/page-header";
import { ChangePasswordForm } from "./change-password-form";
import { RenameForm } from "./rename-form";

export const metadata: Metadata = { title: "My Account" };

/** Each kind as its owner sees it, with what it opens (ADR 0004). A Kiosk Account never gets here. */
const KIND_LABELS = {
  admin: "Admin · the whole Back Office",
  staff: "Staff · the Check-In desk",
  kiosk: "Kiosk",
} satisfies Record<AccountKind, string>;

// Staff (a Staff or Admin Account) see their own Account: email and kind, their name and their
// password. Reached from the account menu, not the sidebar nav; /admin/password redirects here. The
// header is the static shell; the rest needs the session, so a Kiosk Account is sent back to the Kiosk.
export default function MyAccountPage() {
  return (
    <>
      <PageHeader>
        <PageTitle>My Account</PageTitle>
      </PageHeader>
      <PageContent narrow>
        <Suspense fallback={<p className="text-sm leading-normal text-muted-foreground">Loading…</p>}>
          <OwnAccount />
        </Suspense>
      </PageContent>
    </>
  );
}

async function OwnAccount() {
  const staff = await requireStaff();
  return (
    <>
      <section aria-labelledby="account-details-heading">
        <h2 id="account-details-heading" className="text-base leading-normal font-semibold">
          Details
        </h2>
        <dl className="mt-4 grid gap-3 text-sm leading-normal">
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium break-words">{staff.email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Kind of Account</dt>
            <dd className="font-medium">{KIND_LABELS[staff.kind]}</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm leading-normal text-muted-foreground">To change your email, ask an Admin.</p>
        <div className="mt-6">
          <RenameForm name={staff.name} />
        </div>
      </section>
      <section aria-labelledby="change-password-heading" className="mt-10 border-t pt-6">
        <h2 id="change-password-heading" className="text-base leading-normal font-semibold">
          Change password
        </h2>
        <div className="mt-4">
          <ChangePasswordForm email={staff.email} />
        </div>
      </section>
    </>
  );
}
