import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/session";
import { CountsPanel } from "./counts-panel";

// Minimal Back Office shell. Ticket 11 adds the Registration list, 12 the counts, 13 Check-In.
export default function BackOfficeHomePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <Suspense fallback={<p className="text-sm text-muted-foreground">กำลังโหลด…</p>}>
        <BackOfficeHome />
      </Suspense>
      <CountsPanel />
    </main>
  );
}

async function BackOfficeHome() {
  const staff = await requireStaff();

  return (
    <>
      <h1 className="text-2xl leading-normal font-semibold">ระบบหลังบ้าน</h1>
      <p className="mt-2 leading-normal text-muted-foreground">ยินดีต้อนรับ {staff.name}</p>
    </>
  );
}
