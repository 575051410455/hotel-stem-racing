import { KeyRoundIcon } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { homePath } from "@/lib/auth/access";
import { type CurrentStaff, requireStaffForOwnAccount } from "@/lib/auth/session";
import { PageContent, PageHeader, PageTitle } from "../_shell/page-header";
import { ChangePasswordForm } from "./change-password-form";
import { RenameForm } from "./rename-form";
import { SignedInDevices, SignedInDevicesSkeleton } from "./signed-in-devices";

export const metadata: Metadata = { title: "My Account" };

/** Each kind that reaches this page, as its owner sees it, with what it opens (ADR 0004). */
const KIND_LABELS = {
  admin: "Admin · the whole Back Office",
  staff: "Staff · the check-in desk",
} satisfies Record<CurrentStaff["kind"], string>;

// Staff (a Staff or Admin Account) see their own Account: email and kind, their name, their
// password and where they are signed in. Reached from the account menu, not the sidebar nav;
// /admin/password redirects here. The header is the static shell; the rest needs the session, so a
// Kiosk Account is sent back to the Kiosk.
//
// When someone else set the password (account-management 05), every other page sends its owner
// here until they choose their own: a notice says why, the name can still be saved, Signed-in
// devices is left out (its actions are refused meanwhile, and setting the password signed every
// other device out), and a successful change goes on to the Account's home.
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
  const staff = await requireStaffForOwnAccount();
  return (
    <>
      {staff.mustChangePassword && (
        <div className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3 text-sm leading-normal">
          <KeyRoundIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>
            <span className="font-medium">An Admin set your password.</span> Choose your own to continue.
          </p>
        </div>
      )}
      {/* mt-6 below the notice; PageContent drops it when Details comes first. */}
      <section aria-labelledby="account-details-heading" className="mt-6">
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
          <ChangePasswordForm
            email={staff.email}
            homeAfterChange={staff.mustChangePassword ? homePath(staff.kind) : undefined}
          />
        </div>
      </section>
      {/* Left out while the Account must choose its own password: its actions are refused until then. */}
      {!staff.mustChangePassword && (
        <section aria-labelledby="signed-in-devices-heading" className="mt-10 border-t pt-6">
          <h2 id="signed-in-devices-heading" className="text-base leading-normal font-semibold">
            Signed-in devices
          </h2>
          <p className="mt-1 text-sm leading-normal text-muted-foreground">
            Where your Account is signed in. Sign out any device you don&apos;t recognise.
          </p>
          <div className="mt-4">
            {/* Its own boundary: Details and Change password show while the devices are read. */}
            <Suspense fallback={<SignedInDevicesSkeleton />}>
              <SignedInDevices />
            </Suspense>
          </div>
        </section>
      )}
    </>
  );
}
