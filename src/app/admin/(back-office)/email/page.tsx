import type { Metadata } from "next";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/session";
import { PageContent, PageHeader, PageTitle } from "../_shell/page-header";
import { BulkSend } from "./bulk-send";

export const metadata: Metadata = { title: "ส่งอีเมล Event Pass" };

// Bulk send of Event Pass emails (ticket 17). The header and introduction are the static shell;
// the controls are Staff-only and every number comes from a Staff-only endpoint, behind the
// session check.
export default function BulkSendPage() {
  return (
    <>
      <PageHeader>
        <PageTitle>ส่งอีเมล</PageTitle>
      </PageHeader>
      <PageContent narrow>
        <p className="leading-normal text-muted-foreground">
          ส่ง Event Pass ทางอีเมลถึงผู้ลงทะเบียนหลายคนพร้อมกัน เช่น หลังระบบอีเมลขัดข้องหรือเกินโควตา
        </p>
        <Suspense fallback={<p className="mt-6 text-sm leading-normal text-muted-foreground">กำลังโหลด…</p>}>
          <StaffOnlyBulkSend />
        </Suspense>
      </PageContent>
    </>
  );
}

async function StaffOnlyBulkSend() {
  await requireStaff();
  return <BulkSend />;
}
