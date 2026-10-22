import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/session";
import { RegistrationListSection } from "./_registration-list/registration-list-section";
import { CountsPanel } from "./counts-panel";

// /admin: counts (12) and the Registration list (11). Each section checks the session itself.
export default function BackOfficeHomePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <Suspense fallback={<p className="text-sm text-muted-foreground">กำลังโหลด…</p>}>
        <BackOfficeHome />
      </Suspense>
      <CountsPanel />
      <RegistrationListSection />
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
