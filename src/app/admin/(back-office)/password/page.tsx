import type { Metadata } from "next";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/session";
import { PageContent, PageHeader, PageTitle } from "../_shell/page-header";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = { title: "เปลี่ยนรหัสผ่าน" };

// Staff change their own password, from the account menu (not in the sidebar nav). The header is
// the static shell; the form needs the session, so a Kiosk Account is sent back to the Kiosk.
export default function ChangePasswordPage() {
  return (
    <>
      <PageHeader>
        <PageTitle>เปลี่ยนรหัสผ่าน</PageTitle>
      </PageHeader>
      <PageContent narrow>
        <Suspense fallback={<p className="text-sm leading-normal text-muted-foreground">กำลังโหลด…</p>}>
          <StaffOnlyChangePasswordForm />
        </Suspense>
      </PageContent>
    </>
  );
}

async function StaffOnlyChangePasswordForm() {
  const staff = await requireStaff();
  return (
    <>
      <p className="leading-normal text-muted-foreground">
        บัญชี <span className="font-medium text-foreground">{staff.email}</span>
      </p>
      <div className="mt-6">
        <ChangePasswordForm email={staff.email} />
      </div>
    </>
  );
}
