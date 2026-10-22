import type { Metadata } from "next";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/session";
import { eventDayOn } from "@/lib/registrations/event-day-availability";
import { CheckInDesk } from "./check-in-desk";

export const metadata: Metadata = { title: "เช็คอิน" };

// Check-In at the entrance. The heading is the static shell; the desk is Staff-only and needs
// today's date, so it renders at request time behind its own boundary.
export default function CheckInPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl leading-normal font-semibold">เช็คอิน</h1>
      <Suspense fallback={<p className="mt-6 text-sm leading-normal text-muted-foreground">กำลังโหลด…</p>}>
        <CheckInStation />
      </Suspense>
    </main>
  );
}

async function CheckInStation() {
  await requireStaff();
  // After the session read, so this is request time: today's Event Day in Bangkok, if any.
  return <CheckInDesk today={eventDayOn(new Date())?.date ?? null} />;
}
