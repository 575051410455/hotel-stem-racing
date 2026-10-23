import type { Metadata } from "next";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/session";
import { BulkSend } from "./bulk-send";

export const metadata: Metadata = { title: "ส่งอีเมล Event Pass" };

// Bulk send of Event Pass emails (ticket 17). The heading is the static shell; the controls are
// Staff-only and every number comes from a Staff-only endpoint, behind the session check.
export default function BulkSendPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl leading-normal font-semibold">ส่งอีเมล Event Pass</h1>
      <p className="mt-2 leading-normal text-muted-foreground">
        ส่ง Event Pass ทางอีเมลถึงผู้ลงทะเบียนหลายคนพร้อมกัน เช่น หลังระบบอีเมลขัดข้องหรือเกินโควตา
      </p>
      <Suspense fallback={<p className="mt-6 text-sm leading-normal text-muted-foreground">กำลังโหลด…</p>}>
        <StaffOnlyBulkSend />
      </Suspense>
    </main>
  );
}

async function StaffOnlyBulkSend() {
  await requireStaff();
  return <BulkSend />;
}
