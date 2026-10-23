import { Suspense } from "react";
import { requireCheckInAccount } from "@/lib/auth/session";
import { eventDayOn } from "@/lib/registrations/event-day-availability";
import { KioskStation } from "./kiosk-station";

// /kiosk: the Kiosk, and the only page a Kiosk Account can open (ADR 0003). Staff Accounts may
// open it too. The static shell is a plain dark screen; the Kiosk needs the session and today's
// date, so it renders at request time behind the boundary.
export default function KioskPage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="fixed inset-0 flex items-center justify-center bg-brand-deep text-lg text-white/70">
          กำลังเปิด Kiosk…
        </p>
      }
    >
      <SignedInKiosk />
    </Suspense>
  );
}

async function SignedInKiosk() {
  const account = await requireCheckInAccount();
  // After the session read, so this is request time: today's Event Day in Bangkok, if any.
  return <KioskStation today={eventDayOn(new Date())?.date ?? null} accountName={account.name} />;
}
